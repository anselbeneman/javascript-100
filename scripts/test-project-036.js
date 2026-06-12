const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '036', 'minimax-core.js');
const context = vm.createContext({
  window: {},
  Math,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { MinimaxCore } = context.window;
const result = MinimaxCore.analyze({ preset: 'attack' });

if (result.move !== 2 || result.score <= 0) {
  throw new Error(`Expected winning attack move 2, received move ${result.move} with score ${result.score}`);
}

if (result.metrics.nodes < 10 || result.metrics.prunes < 1) {
  throw new Error(`Expected non-trivial alpha-beta search, received ${result.metrics.nodes} nodes and ${result.metrics.prunes} prunes`);
}

const benchmark = MinimaxCore.benchmark({ runs: 9 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.avgNodes < 10) {
  throw new Error('Benchmark returned invalid minimax metrics');
}

console.log(`Project 036 test passed: move ${result.move}, score ${result.score}, nodes ${result.metrics.nodes}`);
