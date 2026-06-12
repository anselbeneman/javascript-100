const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '022', 'mcts-core.js');

function fail(message) {
  throw new Error(message);
}

const context = vm.createContext({ window: {}, Math, Date });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const MctsCore = context.window.MctsCore;

const resultA = MctsCore.runSearch({ iterations: 1400, exploration: 1.41, seed: 2201 });
const resultB = MctsCore.runSearch({ iterations: 1400, exploration: 1.41, seed: 2201 });

if (JSON.stringify(resultA.metrics) !== JSON.stringify(resultB.metrics)) {
  fail('MCTS should be deterministic for the same seed');
}

['iterations', 'nodes', 'deepest', 'rootVisits', 'bestMove', 'bestVisits', 'bestWinRate', 'branching'].forEach((metric) => {
  const value = resultA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`MCTS metric ${metric} must be finite`);
});

if (resultA.metrics.rootVisits !== 1400 || resultA.metrics.nodes < 80 || resultA.metrics.branching !== 9) {
  fail(`Unexpected MCTS search size: ${JSON.stringify(resultA.metrics)}`);
}

if (resultA.bestMove < 0 || resultA.bestMove > 8 || resultA.metrics.bestWinRate <= 0.45) {
  fail('MCTS should return a plausible best move with useful win rate');
}

console.log(`Project 022 test passed: ${resultA.metrics.nodes} nodes, best move ${resultA.bestMove}, win ${(resultA.metrics.bestWinRate * 100).toFixed(1)}%`);
