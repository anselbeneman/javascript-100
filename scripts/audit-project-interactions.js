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
    throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run interaction audit.');
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
      }, 8000);

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

function projectReadyScript(projectId) {
  return `(() => {
    const iframe = document.querySelector('iframe');
    const overlay = document.querySelector('.viewer-overlay');
    const result = {
      projectId: ${JSON.stringify(projectId)},
      iframe: Boolean(iframe),
      iframeClass: iframe ? iframe.className : '',
      overlayVisible: Boolean(overlay),
      docReadyState: null,
      docPath: null,
      title: null,
      canvas: false,
      nonBlankSamples: 0,
      runtimeError: null,
    };

    if (!iframe) return result;

    try {
      const doc = iframe.contentDocument;
      const canvas = doc && doc.querySelector('canvas');

      result.docReadyState = doc && doc.readyState;
      result.docPath = doc && doc.location && doc.location.pathname;
      result.title = doc && doc.title;
      result.canvas = Boolean(canvas);

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const context = canvas.getContext('2d');
        const columns = 20;
        const rows = 12;

        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < columns; x += 1) {
            const sampleX = Math.min(canvas.width - 1, Math.max(0, Math.floor((x + 0.5) * canvas.width / columns)));
            const sampleY = Math.min(canvas.height - 1, Math.max(0, Math.floor((y + 0.5) * canvas.height / rows)));
            const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;

            if (pixel[3] > 0 && (pixel[0] > 3 || pixel[1] > 3 || pixel[2] > 3)) {
              result.nonBlankSamples += 1;
            }
          }
        }
      }
    } catch (error) {
      result.runtimeError = error.message;
    }

    return result;
  })()`;
}

function interactionScript(projectId) {
  return `(async () => {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      return { projectId: ${JSON.stringify(projectId)}, actionFailures: ['missing project iframe'] };
    }

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const delay = (ms) => new Promise((resolve) => win.setTimeout(resolve, ms));
    const audit = {
      projectId: ${JSON.stringify(projectId)},
      actions: [],
      skipped: [],
      actionFailures: [],
      runtimeErrors: [],
      downloads: [],
      clipboardWrites: [],
      controls: {
        buttons: 0,
        selects: 0,
        ranges: 0,
        checkboxes: 0,
        fileInputs: 0,
      },
      canvas: false,
      nonBlankSamples: 0,
      bodyText: '',
    };

    function describe(element) {
      const id = element.id ? '#' + element.id : '';
      const text = (element.textContent || element.getAttribute('aria-label') || element.name || '').trim().replace(/\\s+/g, ' ');
      return (element.tagName.toLowerCase() + id + (text ? ' ' + text.slice(0, 42) : '')).trim();
    }

    function visibleEnough(element) {
      if (element.type === 'hidden') return false;
      if (element.hidden) return false;
      if (element.closest('[hidden]')) return false;
      const style = win.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function dispatchFormEvents(element) {
      element.dispatchEvent(new win.Event('input', { bubbles: true }));
      element.dispatchEvent(new win.Event('change', { bubbles: true }));
    }

    function nextRangeValue(input) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const step = Number(input.step || 1);
      const current = Number(input.value || min);
      const candidate = current + step;

      if (Number.isFinite(candidate) && candidate <= max) return String(candidate);
      if (Number.isFinite(min) && min !== current) return String(min);
      return String(max);
    }

    function sampleCanvas() {
      const canvas = doc.querySelector('canvas');
      audit.canvas = Boolean(canvas);
      audit.nonBlankSamples = 0;

      if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

      const context = canvas.getContext('2d');
      const columns = 20;
      const rows = 12;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const sampleX = Math.min(canvas.width - 1, Math.max(0, Math.floor((x + 0.5) * canvas.width / columns)));
          const sampleY = Math.min(canvas.height - 1, Math.max(0, Math.floor((y + 0.5) * canvas.height / rows)));
          const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;

          if (pixel[3] > 0 && (pixel[0] > 3 || pixel[1] > 3 || pixel[2] > 3)) {
            audit.nonBlankSamples += 1;
          }
        }
      }
    }

    if (!win.__interactionAuditInstalled) {
      win.__interactionAuditInstalled = true;

      win.addEventListener('error', (event) => {
        audit.runtimeErrors.push(event.message || 'window error');
      });

      win.addEventListener('unhandledrejection', (event) => {
        audit.runtimeErrors.push(event.reason && event.reason.message ? event.reason.message : String(event.reason || 'unhandled rejection'));
      });

      try {
        Object.defineProperty(win.navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text) => {
              audit.clipboardWrites.push(String(text || '').slice(0, 120));
            },
          },
        });
      } catch (error) {
        audit.skipped.push('clipboard stub unavailable: ' + error.message);
      }

      const originalAnchorClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function click() {
        if (this.download || String(this.href || '').startsWith('blob:') || String(this.href || '').startsWith('data:')) {
          audit.downloads.push({
            download: this.download || '',
            href: String(this.href || '').slice(0, 48),
          });
          return undefined;
        }

        return originalAnchorClick.call(this);
      };
    }

    doc.querySelectorAll('select').forEach((select) => {
      if (!visibleEnough(select) || select.disabled) return;
      audit.controls.selects += 1;

      try {
        if (select.options.length > 1) {
          select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
          dispatchFormEvents(select);
          audit.actions.push('select ' + describe(select));
        } else {
          audit.skipped.push('single-option select ' + describe(select));
        }
      } catch (error) {
        audit.actionFailures.push('select ' + describe(select) + ': ' + error.message);
      }
    });

    await delay(120);

    doc.querySelectorAll('input').forEach((input) => {
      if (!visibleEnough(input) || input.disabled) return;

      try {
        if (input.type === 'range') {
          audit.controls.ranges += 1;
          input.value = nextRangeValue(input);
          dispatchFormEvents(input);
          audit.actions.push('range ' + describe(input));
        } else if (input.type === 'checkbox') {
          audit.controls.checkboxes += 1;
          input.checked = !input.checked;
          dispatchFormEvents(input);
          audit.actions.push('checkbox ' + describe(input));
        } else if (input.type === 'file') {
          audit.controls.fileInputs += 1;
          const file = new win.File(['{}\\n'], 'interaction-audit.json', { type: 'application/json' });
          const transfer = new win.DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.dispatchEvent(new win.Event('change', { bubbles: true }));
          audit.actions.push('file-input ' + describe(input));
        }
      } catch (error) {
        audit.actionFailures.push('input ' + describe(input) + ': ' + error.message);
      }
    });

    await delay(180);

    const buttons = Array.from(doc.querySelectorAll('button'))
      .filter((button) => visibleEnough(button) && !button.disabled);
    audit.controls.buttons = buttons.length;

    for (const button of buttons) {
      const label = describe(button);
      const lowered = label.toLowerCase();

      if (lowered.includes('import')) {
        audit.skipped.push('import button covered through file input when present: ' + label);
        continue;
      }

      try {
        button.click();
        audit.actions.push('button ' + label);
        await delay(lowered.includes('benchmark') || lowered.includes('tune') ? 450 : 120);
      } catch (error) {
        audit.actionFailures.push('button ' + label + ': ' + error.message);
      }
    }

    await delay(500);
    sampleCanvas();
    audit.bodyText = doc.body ? doc.body.innerText.slice(0, 180) : '';
    return audit;
  })()`;
}

async function waitForProjectReady(client, projectId, waitMs) {
  const started = Date.now();
  let state = null;

  while (Date.now() - started < waitMs) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = await client.send('Runtime.evaluate', {
      expression: projectReadyScript(projectId),
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

  return state;
}

async function auditProjectInteractions(baseUrl, browserPort, projectId, waitMs) {
  const target = await fetch(`http://127.0.0.1:${browserPort}/json/new`, {
    method: 'PUT',
    signal: AbortSignal.timeout(6000),
  }).then((response) => response.json());
  const client = createCdpClient(target.webSocketDebuggerUrl);
  const started = Date.now();
  const problems = [];
  let readyState = null;
  let interactionState = null;

  try {
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Log.enable');
    await client.send('Page.navigate', { url: `${baseUrl}/project/${projectId}` });

    readyState = await waitForProjectReady(client, projectId, waitMs);

    if (!readyState || !readyState.iframe) problems.push('missing iframe');
    if (readyState && readyState.overlayVisible) problems.push('viewer overlay still visible');
    if (readyState && String(readyState.iframeClass || '').includes('is-loading')) problems.push('iframe still loading');
    if (readyState && readyState.docReadyState !== 'complete') problems.push(`document not complete: ${readyState.docReadyState}`);
    if (readyState && !readyState.canvas) problems.push('missing canvas before interactions');
    if (readyState && readyState.canvas && readyState.nonBlankSamples <= 0) problems.push('blank canvas before interactions');
    if (readyState && readyState.runtimeError) problems.push(readyState.runtimeError);

    if (problems.length === 0) {
      const result = await client.send('Runtime.evaluate', {
        expression: interactionScript(projectId),
        returnByValue: true,
        awaitPromise: true,
      });
      interactionState = result.result && result.result.result && result.result.result.value;

      if (!interactionState) problems.push('missing interaction result');
      if (interactionState && interactionState.actionFailures.length > 0) {
        problems.push(...interactionState.actionFailures);
      }
      if (interactionState && interactionState.runtimeErrors.length > 0) {
        problems.push(...interactionState.runtimeErrors);
      }
      if (interactionState && !interactionState.canvas) problems.push('missing canvas after interactions');
      if (interactionState && interactionState.canvas && interactionState.nonBlankSamples <= 0) problems.push('blank canvas after interactions');
      if (interactionState && interactionState.actions.length === 0) problems.push('no interactions executed');
    }

    client.events.forEach((event) => {
      if (event.method === 'Runtime.exceptionThrown') {
        problems.push(event.params.exceptionDetails && event.params.exceptionDetails.text
          ? event.params.exceptionDetails.text
          : 'Runtime exception');
      }

      if (
        event.method === 'Log.entryAdded'
        && event.params
        && event.params.entry
        && event.params.entry.level === 'error'
      ) {
        problems.push(event.params.entry.text);
      }
    });
  } catch (error) {
    problems.push(error.message);
  } finally {
    await client.send('Page.close').catch(() => {});
    await client.close();
  }

  return {
    id: projectId,
    ok: problems.length === 0,
    elapsedMs: Date.now() - started,
    problems,
    readyState,
    interactionState,
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
  const profileDir = path.join(rootDir, 'tmp', `interaction-audit-profile-${Date.now()}`);
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
      const result = await auditProjectInteractions(baseUrl, browserPort, projectId, waitMs);
      results.push(result);
      const status = result.ok ? 'OK' : 'FAIL';
      const actions = result.interactionState ? result.interactionState.actions.length : 0;
      const downloads = result.interactionState ? result.interactionState.downloads.length : 0;
      const clipboard = result.interactionState ? result.interactionState.clipboardWrites.length : 0;
      const suffix = result.ok
        ? ` actions=${actions} downloads=${downloads} clipboard=${clipboard}`
        : ` - ${result.problems.join('; ')}`;
      console.log(`${status} ${projectId} ${result.elapsedMs}ms${suffix}`);
    }

    const failures = results.filter((result) => !result.ok);
    console.log(`Interaction audit checked ${results.length} project(s), ${failures.length} failure(s).`);

    if (failures.length > 0) {
      console.log(JSON.stringify(failures.map((failure) => ({
        id: failure.id,
        problems: failure.problems,
        readyState: failure.readyState,
        interactionState: failure.interactionState,
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
