const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '058', 'core.js');
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
const result = ProjectCore.analyze({ seed: 58, size: 160 });

if (!result.metrics.verified) {
  throw new Error('Project 058 verification failed: ' + JSON.stringify(result.metrics));
}

if (!Number.isFinite(result.metrics.score) || result.metrics.items < 80) {
  throw new Error('Project 058 returned weak metrics: ' + JSON.stringify(result.metrics));
}

const benchmark = ProjectCore.benchmark({ seed: 58, size: 160, runs: 4 });
if (!Number.isFinite(benchmark.avgMs)) {
  throw new Error('Project 058 benchmark returned invalid timing');
}

console.log('Project 058 test passed: ' + JSON.stringify(result.metrics));
