const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '020', 'cloth-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.ClothCore;
}

const ClothCore = loadCore();
const summaryA = ClothCore.summarize({
  cols: 18,
  rows: 12,
  steps: 160,
  iterations: 10,
  wind: 0.12,
  pinMode: 'tabs',
  seed: 2001,
});
const summaryB = ClothCore.summarize({
  cols: 18,
  rows: 12,
  steps: 160,
  iterations: 10,
  wind: 0.12,
  pinMode: 'tabs',
  seed: 2001,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Cloth summary should be deterministic for the same seed');
}

['particles', 'constraints', 'pinned', 'averageStretch', 'maxStretch', 'kineticEnergy'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Cloth metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.particles !== 216 || summaryA.metrics.pinned < 3) {
  fail(`Unexpected cloth dimensions or pins: ${summaryA.metrics.particles} particles, ${summaryA.metrics.pinned} pins`);
}

if (summaryA.metrics.maxStretch > 0.22 || summaryA.metrics.averageStretch > 0.04) {
  fail(`Cloth constraints are too loose: max ${summaryA.metrics.maxStretch}, average ${summaryA.metrics.averageStretch}`);
}

if (summaryA.history.length < 20) {
  fail('Cloth summary should include a useful stretch history');
}

console.log(`Project 020 test passed: ${summaryA.metrics.particles} particles, max stretch ${summaryA.metrics.maxStretch.toFixed(4)}`);
