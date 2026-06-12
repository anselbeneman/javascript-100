const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '040', 'avl-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { AvlCore } = context.window;
const result = AvlCore.analyze({ count: 72 });

if (!result.metrics.valid || result.metrics.maxBalance > 1) {
  throw new Error(`AVL tree is not balanced: ${JSON.stringify(result.metrics)}`);
}

if (result.metrics.height > result.metrics.theoreticalMax || result.metrics.rotations < 8) {
  throw new Error(`Unexpected AVL efficiency metrics: ${JSON.stringify(result.metrics)}`);
}

const sorted = result.ordered.slice().sort((a, b) => a - b);
if (sorted.join(',') !== result.ordered.join(',')) {
  throw new Error('AVL in-order traversal is not sorted');
}

const benchmark = AvlCore.benchmark({ count: 64, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgHeight <= 0) {
  throw new Error('Benchmark returned invalid AVL metrics');
}

console.log(`Project 040 test passed: ${result.metrics.keys} keys, height ${result.metrics.height}, rotations ${result.metrics.rotations}`);
