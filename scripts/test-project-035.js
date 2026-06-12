const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '035', 'kmeans-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
  Float64Array,
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { KMeansCore } = context.window;
const result = KMeansCore.analyze({ k: 5, iterations: 14, count: 360, seed: 35 });

if (result.metrics.emptyClusters !== 0 || result.metrics.improvement < 0.45) {
  throw new Error(`Expected stable clustering, received ${result.metrics.emptyClusters} empty clusters and ${result.metrics.improvement} improvement`);
}

if (result.centroids.length !== 5 || result.assignments.length !== 360) {
  throw new Error('Invalid K-means output dimensions');
}

const benchmark = KMeansCore.benchmark({ k: 5, count: 240, runs: 5 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgInertia <= 0) {
  throw new Error('Benchmark returned invalid K-means metrics');
}

console.log(`Project 035 test passed: inertia ${Math.round(result.metrics.inertia)}, improvement ${(result.metrics.improvement * 100).toFixed(1)}%`);
