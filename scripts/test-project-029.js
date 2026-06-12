const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '029', 'path-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Map,
  Set,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { PathCore } = context.window;
const result = PathCore.analyze({ density: 0.26, seed: 29, heuristic: 'diagonal' });

if (!result.metrics.solved) {
  throw new Error('Expected deterministic A-star scene to be solvable');
}

if (result.metrics.pathLength < 30 || result.metrics.visited < result.metrics.pathLength) {
  throw new Error(`Invalid path metrics: path ${result.metrics.pathLength}, visited ${result.metrics.visited}`);
}

const benchmark = PathCore.benchmark({ density: 0.22, runs: 6 });
if (benchmark.solved < 4 || !Number.isFinite(benchmark.avgVisited)) {
  throw new Error('Benchmark returned weak pathfinding evidence');
}

console.log(`Project 029 test passed: path ${result.metrics.pathLength}, visited ${result.metrics.visited}`);
