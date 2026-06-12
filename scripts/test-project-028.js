const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '028', 'lsystem-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { LSystemCore } = context.window;
const result = LSystemCore.analyze({ preset: 'fern', iterations: 4, angle: 25 });

if (result.metrics.segments < 300 || result.metrics.branches < 100) {
  throw new Error(`Expected a non-trivial fern, received ${result.metrics.segments} segments and ${result.metrics.branches} branches`);
}

if (result.bounds.height <= result.bounds.width * 0.9) {
  throw new Error('Expected fern geometry to grow mostly vertical');
}

const benchmark = LSystemCore.benchmark({ preset: 'bush', iterations: 3, runs: 5 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.segments <= 100) {
  throw new Error('Benchmark returned invalid L-system metrics');
}

console.log(`Project 028 test passed: ${result.metrics.segments} segments, depth ${result.metrics.maxDepth}`);
