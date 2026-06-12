const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '089', 'core.js');
const context = vm.createContext({
  window: {},
  Math,
  Map,
  Set,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { ProjectCore } = context.window;
const result = ProjectCore.analyze({ seed: 89, size: 520 });

if (!result.metrics.verified) {
  throw new Error('Project 089 verification failed: ' + JSON.stringify(result.metrics));
}

if (!Number.isFinite(result.metrics.score) || result.metrics.items < 4) {
  throw new Error('Project 089 returned weak metrics: ' + JSON.stringify(result.metrics));
}

const benchmark = ProjectCore.benchmark({ seed: 89, size: 520, runs: 4 });
if (!Number.isFinite(benchmark.avgMs)) {
  throw new Error('Project 089 benchmark returned invalid timing');
}

console.log('Project 089 test passed: ' + JSON.stringify(result.metrics));
