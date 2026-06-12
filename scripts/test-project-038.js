const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '038', 'scheduler-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Map,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { SchedulerCore } = context.window;
const result = SchedulerCore.analyze({ count: 16, density: 0.22, seed: 38 });

if (!result.metrics.validOrder || result.metrics.hasCycle) {
  throw new Error('Expected a valid acyclic topological order');
}

if (result.order.length !== 16 || result.metrics.criticalDuration < 16) {
  throw new Error(`Invalid scheduler metrics: ${JSON.stringify(result.metrics)}`);
}

const benchmark = SchedulerCore.benchmark({ count: 20, density: 0.2, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgEdges < 20) {
  throw new Error('Benchmark returned invalid scheduler metrics');
}

console.log(`Project 038 test passed: ${result.metrics.edges} edges, critical path ${result.metrics.criticalDuration}`);
