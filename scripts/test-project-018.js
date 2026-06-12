const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '018', 'wave-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date, Float32Array, Uint8Array });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.WaveCore;
}

const WaveCore = loadCore();
const summaryA = WaveCore.summarize({
  preset: 'split',
  size: 72,
  steps: 120,
  waveSpeed: 0.44,
  damping: 0.006,
  seed: 1801,
});
const summaryB = WaveCore.summarize({
  preset: 'split',
  size: 72,
  steps: 120,
  waveSpeed: 0.44,
  damping: 0.006,
  seed: 1801,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Wave simulation should be deterministic for the same seed');
}

if (summaryA.field.current.length !== 72 * 72) {
  fail(`Expected 72 x 72 field, received ${summaryA.field.current.length} cells`);
}

['energy', 'maxAmplitude', 'activeCells', 'blockedCells', 'activeRatio'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Wave metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.energy <= 0 || summaryA.metrics.maxAmplitude <= 0.001) {
  fail('Wave simulation should retain measurable propagated energy');
}

if (summaryA.history.length < 10 || summaryA.metrics.blockedCells <= 0) {
  fail('Wave simulation should expose energy history and obstacle cells');
}

console.log(`Project 018 test passed: energy ${summaryA.metrics.energy.toFixed(3)}, active ${(summaryA.metrics.activeRatio * 100).toFixed(1)}%`);
