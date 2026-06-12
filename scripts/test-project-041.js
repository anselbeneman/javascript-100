const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '041', 'hull-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { HullCore } = context.window;
const result = HullCore.analyze({ count: 180, seed: 41 });

if (!result.metrics.containsAll || result.metrics.hullPoints < 10) {
  throw new Error(`Expected enclosing hull with enough vertices: ${JSON.stringify(result.metrics)}`);
}

if (result.metrics.area <= 1 || result.metrics.perimeter <= 3) {
  throw new Error(`Invalid hull geometry metrics: ${JSON.stringify(result.metrics)}`);
}

const benchmark = HullCore.benchmark({ count: 160, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgHullPoints < 8) {
  throw new Error('Benchmark returned invalid hull metrics');
}

console.log(`Project 041 test passed: ${result.metrics.points} points, ${result.metrics.hullPoints} hull vertices`);
