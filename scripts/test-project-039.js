const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '039', 'btree-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { BTreeCore } = context.window;
const result = BTreeCore.analyze({ degree: 3, count: 42 });

if (!result.search.found || result.metrics.height < 2 || result.metrics.nodes < 4) {
  throw new Error(`Expected searchable multi-node B-tree, received ${JSON.stringify(result.metrics)}`);
}

const sorted = result.sortedKeys.slice().sort((a, b) => a - b);
if (sorted.join(',') !== result.sortedKeys.join(',')) {
  throw new Error('B-tree in-order traversal is not sorted');
}

const benchmark = BTreeCore.benchmark({ degree: 3, count: 48, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgSearchDepth < 1) {
  throw new Error('Benchmark returned invalid B-tree metrics');
}

console.log(`Project 039 test passed: ${result.metrics.keys} keys, height ${result.metrics.height}, nodes ${result.metrics.nodes}`);
