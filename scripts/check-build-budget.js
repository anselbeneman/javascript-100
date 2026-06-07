const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = process.cwd();
const staticDir = path.join(rootDir, 'build', 'static');
const budgets = {
  jsGzip: 96 * 1024,
  cssGzip: 10 * 1024,
  totalGzip: 110 * 1024,
  jsRaw: 320 * 1024,
  cssRaw: 24 * 1024,
};

function fail(message) {
  throw new Error(message);
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }

      return entry.isFile() ? [entryPath] : [];
    });
}

function collectAssets() {
  if (!fs.existsSync(staticDir)) {
    fail('Missing build/static. Run npm run build first.');
  }

  return listFiles(staticDir)
    .filter((filePath) => filePath.endsWith('.js') || filePath.endsWith('.css'))
    .map((filePath) => {
      const buffer = fs.readFileSync(filePath);
      return {
        filePath,
        type: path.extname(filePath).slice(1),
        rawBytes: buffer.length,
        gzipBytes: zlib.gzipSync(buffer).length,
      };
    });
}

function sumAssets(assets, type, field) {
  return assets
    .filter((asset) => asset.type === type)
    .reduce((total, asset) => total + asset[field], 0);
}

function assertBudget(label, actual, limit) {
  if (actual > limit) {
    fail(`${label} is ${formatKiB(actual)}, over budget ${formatKiB(limit)}`);
  }
}

function main() {
  const assets = collectAssets();

  if (assets.length === 0) {
    fail('No production JS or CSS assets found in build/static.');
  }

  const jsGzip = sumAssets(assets, 'js', 'gzipBytes');
  const cssGzip = sumAssets(assets, 'css', 'gzipBytes');
  const totalGzip = assets.reduce((total, asset) => total + asset.gzipBytes, 0);
  const jsRaw = sumAssets(assets, 'js', 'rawBytes');
  const cssRaw = sumAssets(assets, 'css', 'rawBytes');

  assertBudget('JavaScript gzip size', jsGzip, budgets.jsGzip);
  assertBudget('CSS gzip size', cssGzip, budgets.cssGzip);
  assertBudget('Total static gzip size', totalGzip, budgets.totalGzip);
  assertBudget('JavaScript raw size', jsRaw, budgets.jsRaw);
  assertBudget('CSS raw size', cssRaw, budgets.cssRaw);

  console.log([
    'Build budget passed:',
    `JS ${formatKiB(jsGzip)} gzip / ${formatKiB(budgets.jsGzip)}`,
    `CSS ${formatKiB(cssGzip)} gzip / ${formatKiB(budgets.cssGzip)}`,
    `Total ${formatKiB(totalGzip)} gzip / ${formatKiB(budgets.totalGzip)}`,
  ].join(' '));
}

main();
