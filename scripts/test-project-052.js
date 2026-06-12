const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '052', 'core.js');
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
const result = ProjectCore.analyze({ seed: 52, size: 180 });

if (!result.metrics.verified) {
  throw new Error('Project 052 verification failed: ' + JSON.stringify(result.metrics));
}

if (!Number.isFinite(result.metrics.score) || result.metrics.items < 100) {
  throw new Error('Project 052 returned weak metrics: ' + JSON.stringify(result.metrics));
}

const benchmark = ProjectCore.benchmark({ seed: 52, size: 180, runs: 4 });
if (!Number.isFinite(benchmark.avgMs)) {
  throw new Error('Project 052 benchmark returned invalid timing');
}

console.log('Project 052 test passed: ' + JSON.stringify(result.metrics));
