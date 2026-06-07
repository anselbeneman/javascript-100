const fs = require('fs');
const http = require('http');
const path = require('path');

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build');
const isCheckMode = process.argv.includes('--check');
const requestedPort = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; worker-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; manifest-src 'self'",
};

function fail(message) {
  throw new Error(message);
}

function assertBuildReady() {
  const indexPath = path.join(buildDir, 'index.html');
  const fallbackPath = path.join(buildDir, '404.html');

  if (!fs.existsSync(indexPath)) {
    fail('Missing build/index.html. Run npm run build first.');
  }

  if (!fs.existsSync(fallbackPath)) {
    fail('Missing build/404.html. Run npm run build first.');
  }

  if (fs.readFileSync(indexPath, 'utf8') !== fs.readFileSync(fallbackPath, 'utf8')) {
    fail('build/404.html must match build/index.html for static SPA fallback hosting.');
  }

  if (!fs.existsSync(path.join(buildDir, '.nojekyll'))) {
    fail('Missing build/.nojekyll for GitHub Pages static hosting.');
  }

  const manifestPath = path.join(buildDir, 'projects.json');
  if (!fs.existsSync(manifestPath)) {
    fail('Missing build/projects.json. Run npm run build first.');
  }

  const projects = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  projects.forEach((project) => {
    if (!fs.existsSync(path.join(buildDir, 'projects', project.id, 'index.html'))) {
      fail(`Missing build/projects/${project.id}/index.html. Run npm run build first.`);
    }
  });
}

function resolvePublicPath(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const candidatePath = path.normalize(path.join(buildDir, relativePath));
  const resolvedBuildDir = path.resolve(buildDir);
  const resolvedCandidate = path.resolve(candidatePath);

  if (!resolvedCandidate.startsWith(resolvedBuildDir + path.sep) && resolvedCandidate !== resolvedBuildDir) {
    return { status: 403 };
  }

  if (fs.existsSync(resolvedCandidate) && fs.statSync(resolvedCandidate).isFile()) {
    return { status: 200, filePath: resolvedCandidate };
  }

  if (fs.existsSync(resolvedCandidate) && fs.statSync(resolvedCandidate).isDirectory()) {
    const indexPath = path.join(resolvedCandidate, 'index.html');
    if (fs.existsSync(indexPath)) {
      return { status: 200, filePath: indexPath };
    }
  }

  if (decodedPath.startsWith('/projects/')) {
    return { status: 404 };
  }

  return { status: 200, filePath: path.join(buildDir, 'index.html') };
}

function createServer() {
  return http.createServer((request, response) => {
    const resolved = resolvePublicPath(request.url || '/');

    if (resolved.status !== 200) {
      response.writeHead(resolved.status, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(resolved.status === 403 ? 'Forbidden' : 'Not found');
      return;
    }

    const extension = path.extname(resolved.filePath).toLowerCase();
    response.writeHead(200, {
      'content-type': mimeTypes[extension] || 'application/octet-stream',
      'cache-control': 'no-store',
      ...securityHeaders,
    });
    fs.createReadStream(resolved.filePath).pipe(response);
  });
}

function requestPath(port, pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      timeout: 5000,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out requesting ${pathname}`));
    });
    request.on('error', reject);
  });
}

function assertSecurityHeaders(response, pathname) {
  Object.entries(securityHeaders).forEach(([key, expected]) => {
    if (response.headers[key] !== expected) {
      fail(`Preview route ${pathname} header ${key} must be "${expected}"`);
    }
  });
}

function readBuildProjects() {
  const manifestPath = path.join(buildDir, 'projects.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

async function runRouteCheck(server) {
  const { port } = server.address();
  const projects = readBuildProjects();
  const checks = [
    {
      path: '/',
      expect: 'JavaScript 100 Ansel',
    },
    {
      path: '/unknown-route',
      expect: '<div id="root"></div>',
    },
    {
      path: '/404.html',
      expect: '<div id="root"></div>',
    },
    {
      path: '/.nojekyll',
      expect: 'Disable Jekyll',
    },
    {
      path: '/projects.json',
      expect: projects.length === 0 ? '[]' : projects[0].name,
    },
    {
      path: '/favicon.svg',
      expect: '<svg',
    },
    {
      path: '/icon-192.png',
      contentType: 'image/png',
    },
    {
      path: '/icon-512.png',
      contentType: 'image/png',
    },
    {
      path: '/robots.txt',
      expect: 'Sitemap: https://javascript-100-ansel.vercel.app/sitemap.xml',
    },
    {
      path: '/sitemap.xml',
      expect: 'https://javascript-100-ansel.vercel.app/',
    },
    {
      path: '/site.webmanifest',
      expect: '"name": "JavaScript 100 Ansel"',
    },
  ];

  for (const check of checks) {
    const response = await requestPath(port, check.path);
    if (response.statusCode !== 200) {
      fail(`Preview route ${check.path} returned ${response.statusCode}`);
    }
    if (check.expect && !response.body.includes(check.expect)) {
      fail(`Preview route ${check.path} did not include expected text: ${check.expect}`);
    }
    if (check.contentType && !String(response.headers['content-type'] || '').startsWith(check.contentType)) {
      fail(`Preview route ${check.path} must use content-type ${check.contentType}`);
    }
    assertSecurityHeaders(response, check.path);
  }

  for (const project of projects) {
    const viewerResponse = await requestPath(port, `/project/${project.id}`);
    if (viewerResponse.statusCode !== 200 || !viewerResponse.body.includes('<div id="root"></div>')) {
      fail(`Preview route /project/${project.id} did not return the hub shell`);
    }
    assertSecurityHeaders(viewerResponse, `/project/${project.id}`);

    const projectAssetResponse = await requestPath(port, `/projects/${project.id}/index.html`);
    if (projectAssetResponse.statusCode !== 200 || !projectAssetResponse.body.includes(`${project.id} - ${project.name}`)) {
      fail(`Preview route /projects/${project.id}/index.html did not return the standalone project`);
    }
    assertSecurityHeaders(projectAssetResponse, `/projects/${project.id}/index.html`);

    const sitemapResponse = await requestPath(port, '/sitemap.xml');
    if (!sitemapResponse.body.includes(`https://javascript-100-ansel.vercel.app/project/${project.id}`)) {
      fail(`Preview sitemap must include /project/${project.id}`);
    }
  }

  const missingProjectAsset = await requestPath(port, '/projects/999/index.html');
  if (missingProjectAsset.statusCode !== 404) {
    fail(`Preview route /projects/999/index.html must return 404, received ${missingProjectAsset.statusCode}`);
  }

  console.log(`Preview route smoke passed on http://127.0.0.1:${port}`);
}

async function main() {
  assertBuildReady();
  const server = createServer();
  const port = isCheckMode ? 0 : requestedPort;

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (isCheckMode) {
    try {
      await runRouteCheck(server);
    } finally {
      server.close();
    }
    return;
  }

  console.log(`Preview available at http://127.0.0.1:${address.port}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
