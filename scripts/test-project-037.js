const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '037', 'triangulate-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { TriangulateCore } = context.window;
const result = TriangulateCore.analyze({ count: 15, notch: 0.58, phase: 0.2 });

if (result.metrics.triangles !== result.metrics.expectedTriangles) {
  throw new Error(`Expected ${result.metrics.expectedTriangles} triangles, received ${result.metrics.triangles}`);
}

if (result.metrics.areaError > 1e-8) {
  throw new Error(`Triangulation area error too high: ${result.metrics.areaError}`);
}

const benchmark = TriangulateCore.benchmark({ count: 19, runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgTriangles < 12) {
  throw new Error('Benchmark returned invalid triangulation metrics');
}

console.log(`Project 037 test passed: ${result.metrics.triangles} triangles, area error ${result.metrics.areaError.toExponential(2)}`);
