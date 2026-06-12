const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '045', 'anneal-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { AnnealCore } = context.window;
const result = AnnealCore.analyze({ count: 30, iterations: 2600, temperature: 1.4, seed: 45 });

if (result.metrics.improvement < 0.2 || result.metrics.bestLength >= result.metrics.initialLength) {
  throw new Error(`Expected route improvement, received ${JSON.stringify(result.metrics)}`);
}

if (result.route.length !== result.metrics.cities || new Set(result.route).size !== result.metrics.cities) {
  throw new Error('Annealing returned an invalid route permutation');
}

const benchmark = AnnealCore.benchmark({ count: 24, iterations: 1000, runs: 4 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgImprovement <= 0) {
  throw new Error('Benchmark returned invalid annealing metrics');
}

console.log(`Project 045 test passed: ${result.metrics.initialLength.toFixed(3)} -> ${result.metrics.bestLength.toFixed(3)}`);
