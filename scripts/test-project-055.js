const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '055', 'core.js');
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
const result = ProjectCore.analyze({ seed: 55, size: 80 });

if (!result.metrics.verified) {
  throw new Error('Project 055 verification failed: ' + JSON.stringify(result.metrics));
}

if (!Number.isFinite(result.metrics.score) || result.metrics.items < 8) {
  throw new Error('Project 055 returned weak metrics: ' + JSON.stringify(result.metrics));
}

const benchmark = ProjectCore.benchmark({ seed: 55, size: 80, runs: 4 });
if (!Number.isFinite(benchmark.avgMs)) {
  throw new Error('Project 055 benchmark returned invalid timing');
}

console.log('Project 055 test passed: ' + JSON.stringify(result.metrics));
