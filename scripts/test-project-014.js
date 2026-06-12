const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '014', 'kalman-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.KalmanCore;
}

const KalmanCore = loadCore();
const summaryA = KalmanCore.summarize({
  steps: 220,
  noise: 0.11,
  processNoise: 0.022,
  seed: 1401,
});
const summaryB = KalmanCore.summarize({
  steps: 220,
  noise: 0.11,
  processNoise: 0.022,
  seed: 1401,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Kalman summary should be deterministic for the same seed');
}

if (summaryA.track.truth.length !== 220 || summaryA.filter.filtered.length !== 220) {
  fail('Kalman filter should preserve the configured step count');
}

['measurementRmse', 'filteredRmse', 'improvement', 'averageResidual', 'finalGain'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Kalman metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.filteredRmse >= summaryA.metrics.measurementRmse) {
  fail(`Expected filtered RMSE to beat raw measurement RMSE: ${summaryA.metrics.filteredRmse} >= ${summaryA.metrics.measurementRmse}`);
}

if (summaryA.metrics.improvement < 0.2) {
  fail(`Expected useful Kalman improvement, received ${(summaryA.metrics.improvement * 100).toFixed(1)}%`);
}

const last = summaryA.filter.filtered[summaryA.filter.filtered.length - 1];
if (!Number.isFinite(last.pxx) || !Number.isFinite(last.pyy) || last.pxx <= 0 || last.pyy <= 0) {
  fail('Kalman covariance should remain finite and positive');
}

console.log(`Project 014 test passed: raw RMSE ${summaryA.metrics.measurementRmse.toFixed(4)} -> filtered ${summaryA.metrics.filteredRmse.toFixed(4)}`);
