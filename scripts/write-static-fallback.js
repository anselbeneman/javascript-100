const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build');
const indexPath = path.join(buildDir, 'index.html');
const fallbackPath = path.join(buildDir, '404.html');

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(indexPath)) {
  fail('Missing build/index.html. Run npm run build first.');
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');

if (!indexHtml.includes('<div id="root"></div>')) {
  fail('build/index.html does not look like the React hub entrypoint.');
}

fs.writeFileSync(fallbackPath, indexHtml, 'utf8');

console.log('Wrote build/404.html static SPA fallback');
