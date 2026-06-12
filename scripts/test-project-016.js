const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '016', 'fourier-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.FourierCore;
}

const FourierCore = loadCore();
const summaryA = FourierCore.summarize({
  preset: 'gear',
  count: 160,
  harmonics: 26,
  seed: 1601,
});
const summaryB = FourierCore.summarize({
  preset: 'gear',
  count: 160,
  harmonics: 26,
  seed: 1601,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Fourier summary should be deterministic for the same seed');
}

if (summaryA.points.length !== 160 || summaryA.coefficients.length !== 160) {
  fail('Fourier transform should preserve the configured sample count');
}

['dominantAmplitude', 'partialError', 'lowError', 'fullError', 'compressionRatio'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Fourier metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.partialError >= summaryA.metrics.lowError) {
  fail(`Expected more harmonics to reduce error: ${summaryA.metrics.partialError} >= ${summaryA.metrics.lowError}`);
}

if (summaryA.metrics.fullError > 1e-8) {
  fail(`Full Fourier reconstruction should be nearly exact, received ${summaryA.metrics.fullError}`);
}

console.log(`Project 016 test passed: partial RMSE ${summaryA.metrics.partialError.toFixed(5)}, full RMSE ${summaryA.metrics.fullError.toExponential(2)}`);
