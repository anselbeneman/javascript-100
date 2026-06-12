const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '030', 'marching-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { MarchingCore } = context.window;
const result = MarchingCore.analyze({ cols: 56, rows: 36, threshold: 0, phase: 0.18 });

if (result.metrics.segments < 90 || result.metrics.cells !== 1925) {
  throw new Error(`Unexpected Marching Squares metrics: ${result.metrics.segments} segments, ${result.metrics.cells} cells`);
}

if (result.metrics.activeRatio <= 0.1 || result.metrics.activeRatio >= 0.9) {
  throw new Error(`Expected mixed scalar field, received active ratio ${result.metrics.activeRatio}`);
}

const benchmark = MarchingCore.benchmark({ cols: 48, rows: 32, runs: 6 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.segments < 60) {
  throw new Error('Benchmark returned invalid contour evidence');
}

console.log(`Project 030 test passed: ${result.metrics.segments} segments, ${result.metrics.ambiguous} ambiguous cells`);
