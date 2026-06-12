const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '034', 'tree-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Set,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { TreeCore } = context.window;
const result = TreeCore.analyze({ count: 220, maxDepth: 5, seed: 34 });

if (result.metrics.nodes < 5 || result.metrics.testAccuracy < 0.78) {
  throw new Error(`Expected useful decision tree, received ${result.metrics.nodes} nodes and ${result.metrics.testAccuracy} accuracy`);
}

const benchmark = TreeCore.benchmark({ count: 180, runs: 5 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgAccuracy < 0.74) {
  throw new Error('Benchmark returned weak decision tree evidence');
}

console.log(`Project 034 test passed: ${result.metrics.nodes} nodes, ${(result.metrics.testAccuracy * 100).toFixed(1)}% test accuracy`);
