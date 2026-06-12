const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '051', 'core.js');
const context = vm.createContext({
  window: {},
  Math,
  Map,
  Set,
  Uint32Array,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { ProjectCore } = context.window;
const result = ProjectCore.analyze({ seed: 51, size: 180 });

if (!result.metrics.verified) {
  throw new Error('Project 051 verification failed: ' + JSON.stringify(result.metrics));
}

if (!Number.isFinite(result.metrics.score) || result.metrics.items < 6) {
  throw new Error('Project 051 returned weak metrics: ' + JSON.stringify(result.metrics));
}

const benchmark = ProjectCore.benchmark({ seed: 51, size: 180, runs: 4 });
if (!Number.isFinite(benchmark.avgMs)) {
  throw new Error('Project 051 benchmark returned invalid timing');
}

console.log('Project 051 test passed: ' + JSON.stringify(result.metrics));
