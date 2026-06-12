const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = process.cwd();
const defaultBaseUrl = process.env.RUNTIME_AUDIT_BASE_URL || 'http://127.0.0.1:3000';
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function readArg(name, fallback) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function parseIntArg(name, fallback) {
  const value = Number.parseInt(readArg(name, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

function findChrome() {
  const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));

  if (!chromePath) {
    throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run runtime audit.');
  }

  return chromePath;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 0;
  const pending = new Map();
  const events = [];

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
      return;
    }

    if (data.method) {
      events.push(data);
    }
  };

  const opened = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  async function send(method, params = {}) {
    await opened;
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, 6000);

      pending.set(id, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  function close() {
    return new Promise((resolve) => {
      if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        resolve();
        return;
      }

      const timer = setTimeout(resolve, 400);
      socket.onclose = () => {
        clearTimeout(timer);
        resolve();
      };
      socket.close();
    });
  }

  return {
    events,
    close,
    send,
  };
}

function readPublishedProjectIds() {
  const manifestPath = path.join(rootDir, 'public', 'projects.json');
  const projects = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return projects.map((project) => project.id);
}

function evaluateProjectStateScript(projectId) {
  return `(() => {
    const iframe = document.querySelector('iframe');
    const overlay = document.querySelector('.viewer-overlay');
    const result = {
      projectId: ${JSON.stringify(projectId)},
      location: location.href,
      iframe: Boolean(iframe),
      iframeClass: iframe ? iframe.className : '',
      iframeSrc: iframe ? iframe.src : '',
      overlayVisible: Boolean(overlay),
      overlayText: overlay ? overlay.textContent.trim() : '',
      docReadyState: null,
      docPath: null,
      title: null,
      canvas: false,
      canvasSize: null,
      nonBlankSamples: 0,
      bodyText: '',
      runtimeError: null,
    };

    if (!iframe) return result;

    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const canvas = doc && doc.querySelector('canvas');

      result.docReadyState = doc && doc.readyState;
      result.docPath = doc && doc.location && doc.location.pathname;
      result.title = doc && doc.title;
      result.bodyText = doc && doc.body ? doc.body.innerText.slice(0, 180) : '';
      result.canvas = Boolean(canvas);
      result.canvasSize = canvas ? [canvas.width, canvas.height] : null;
      result.hasKnownCore = Boolean(win && (
        win.ProjectCore
        || win.FlockCore
        || win.FluidCore
        || win.RayTracingCore
        || win.app
      ));

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const context = canvas.getContext('2d');
        const columns = 24;
        const rows = 14;
        let nonBlankSamples = 0;

        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < columns; x += 1) {
            const sampleX = Math.min(canvas.width - 1, Math.max(0, Math.floor((x + 0.5) * canvas.width / columns)));
            const sampleY = Math.min(canvas.height - 1, Math.max(0, Math.floor((y + 0.5) * canvas.height / rows)));
            const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;

            if (pixel[3] > 0 && (pixel[0] > 3 || pixel[1] > 3 || pixel[2] > 3)) {
              nonBlankSamples += 1;
            }
          }
        }

        result.nonBlankSamples = nonBlankSamples;
      }
    } catch (error) {
      result.runtimeError = error.message;
    }

    return result;
  })()`;
}

async function auditProject(baseUrl, browserPort, projectId, waitMs) {
  const newTargetUrl = `http://127.0.0.1:${browserPort}/json/new`;
  const target = await fetch(newTargetUrl, { method: 'PUT', signal: AbortSignal.timeout(6000) }).then((response) => response.json());
  const client = createCdpClient(target.webSocketDebuggerUrl);
  const errors = [];
  let state = null;
  const started = Date.now();

  try {
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Log.enable');
    await client.send('Page.navigate', { url: `${baseUrl}/project/${projectId}` });

    while (Date.now() - started < waitMs) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const result = await client.send('Runtime.evaluate', {
        expression: evaluateProjectStateScript(projectId),
        returnByValue: true,
        awaitPromise: true,
      });
      state = result.result && result.result.result && result.result.result.value;

      if (
        state
        && state.iframe
        && !state.overlayVisible
        && !String(state.iframeClass || '').includes('is-loading')
        && state.docReadyState === 'complete'
        && state.canvas
        && state.nonBlankSamples > 0
      ) {
        break;
      }
    }
  } catch (error) {
    errors.push(error.message);
  }

  client.events.forEach((event) => {
    if (event.method === 'Runtime.exceptionThrown') {
      errors.push(event.params.exceptionDetails && event.params.exceptionDetails.text
        ? event.params.exceptionDetails.text
        : 'Runtime exception');
    }

    if (
      event.method === 'Log.entryAdded'
      && event.params
      && event.params.entry
      && event.params.entry.level === 'error'
    ) {
      errors.push(event.params.entry.text);
    }
  });

  await client.send('Page.close').catch(() => {});
  await client.close();

  const problems = [];

  if (!state || !state.iframe) problems.push('missing iframe');
  if (state && state.overlayVisible) problems.push(`viewer overlay visible: ${state.overlayText}`);
  if (state && String(state.iframeClass || '').includes('is-loading')) problems.push('iframe still marked loading');
  if (state && state.docReadyState !== 'complete') problems.push(`document not complete: ${state.docReadyState}`);
  if (state && !state.canvas) problems.push('missing canvas');
  if (state && state.canvas && state.nonBlankSamples <= 0) problems.push('canvas appears blank');
  if (state && state.runtimeError) problems.push(state.runtimeError);
  errors.forEach((error) => problems.push(error));

  return {
    id: projectId,
    ok: problems.length === 0,
    elapsedMs: Date.now() - started,
    problems,
    state,
  };
}

async function main() {
  const baseUrl = readArg('--base', defaultBaseUrl).replace(/\/$/, '');
  const from = parseIntArg('--from', 1);
  const to = parseIntArg('--to', 100);
  const waitMs = parseIntArg('--wait-ms', 12000);
  const projectIds = readPublishedProjectIds()
    .filter((id) => Number(id) >= from && Number(id) <= to);

  const browserPort = await findFreePort();
  const chromePath = findChrome();
  const profileDir = path.join(rootDir, 'tmp', `runtime-audit-profile-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${browserPort}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    await waitForJson(`http://127.0.0.1:${browserPort}/json/version`, 10000);

    const results = [];

    for (const projectId of projectIds) {
      const result = await auditProject(baseUrl, browserPort, projectId, waitMs);
      results.push(result);
      const status = result.ok ? 'OK' : 'FAIL';
      const suffix = result.ok ? '' : ` - ${result.problems.join('; ')}`;
      console.log(`${status} ${projectId} ${result.elapsedMs}ms${suffix}`);
    }

    const failures = results.filter((result) => !result.ok);
    console.log(`Runtime audit checked ${results.length} project(s), ${failures.length} failure(s).`);

    if (failures.length > 0) {
      console.log(JSON.stringify(failures.map((failure) => ({
        id: failure.id,
        problems: failure.problems,
        state: failure.state,
      })), null, 2));
      process.exitCode = 1;
    }
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
