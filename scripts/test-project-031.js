const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '031', 'clip-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { ClipCore } = context.window;
const result = ClipCore.analyze({ window: 'hexagon', scale: 0.68, points: 11 });

if (result.metrics.clippedVertices < 6 || result.metrics.clippedArea <= 0) {
  throw new Error(`Expected a visible clipped polygon, received ${result.metrics.clippedVertices} vertices`);
}

if (result.metrics.retainedRatio <= 0 || result.metrics.retainedRatio >= 1) {
  throw new Error(`Expected clipping to retain a partial area, received ${result.metrics.retainedRatio}`);
}

const benchmark = ClipCore.benchmark({ window: 'diamond', points: 13, runs: 10 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.clippedVertices < 4) {
  throw new Error('Benchmark returned invalid clipping metrics');
}

console.log(`Project 031 test passed: ${result.metrics.clippedVertices} output vertices, ${(result.metrics.retainedRatio * 100).toFixed(1)}% retained`);
