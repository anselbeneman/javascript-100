const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '043', 'logistic-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { LogisticCore } = context.window;
const result = LogisticCore.analyze({ count: 260, epochs: 260, learningRate: 0.85, seed: 43 });

if (result.metrics.accuracy < 0.94 || result.metrics.loss > 0.22) {
  throw new Error(`Expected strong logistic regression fit, received ${JSON.stringify(result.metrics)}`);
}

if (result.metrics.wx <= 0 || result.metrics.wy >= 0) {
  throw new Error(`Expected learned weights to match source boundary, received wx ${result.metrics.wx}, wy ${result.metrics.wy}`);
}

const benchmark = LogisticCore.benchmark({ count: 180, epochs: 160, runs: 5 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgAccuracy < 0.9) {
  throw new Error('Benchmark returned weak logistic regression metrics');
}

console.log(`Project 043 test passed: loss ${result.metrics.loss.toFixed(3)}, accuracy ${(result.metrics.accuracy * 100).toFixed(1)}%`);
