const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '044', 'quadtree-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Set,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { QuadtreeCore } = context.window;
const result = QuadtreeCore.analyze({ count: 640, capacity: 8, seed: 44 });

if (!result.metrics.verified || result.metrics.hits !== result.metrics.bruteHits) {
  throw new Error(`Quadtree query did not match brute force: ${JSON.stringify(result.metrics)}`);
}

if (result.metrics.nodes < 20 || result.metrics.visited >= result.metrics.points) {
  throw new Error(`Expected useful spatial index metrics: ${JSON.stringify(result.metrics)}`);
}

const benchmark = QuadtreeCore.benchmark({ count: 520, capacity: 8, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgVisited <= 0) {
  throw new Error('Benchmark returned invalid quadtree metrics');
}

console.log(`Project 044 test passed: ${result.metrics.hits} hits, ${result.metrics.visited} nodes visited`);
