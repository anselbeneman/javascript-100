const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '042', 'pso-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { PsoCore } = context.window;
const result = PsoCore.analyze({ objective: 'rosenbrock', count: 72, iterations: 110, seed: 42 });

if (result.metrics.bestScore > 0.08) {
  throw new Error(`Expected Rosenbrock convergence below 0.08, received ${result.metrics.bestScore}`);
}

if (Math.abs(result.metrics.bestX - 1) > 0.35 || Math.abs(result.metrics.bestY - 1) > 0.6) {
  throw new Error(`Best position is too far from Rosenbrock optimum: ${result.metrics.bestX}, ${result.metrics.bestY}`);
}

const benchmark = PsoCore.benchmark({ objective: 'rastrigin', count: 48, iterations: 70, runs: 5 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgBestScore < 0) {
  throw new Error('Benchmark returned invalid PSO metrics');
}

console.log(`Project 042 test passed: best ${result.metrics.bestScore.toExponential(3)} at (${result.metrics.bestX.toFixed(3)}, ${result.metrics.bestY.toFixed(3)})`);
