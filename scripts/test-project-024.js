const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '024', 'exact-core.js');
function fail(message) { throw new Error(message); }
const context = vm.createContext({ window: {}, Math, Date });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const ExactCore = context.window.ExactCore;

['balanced', 'hard', 'expert'].forEach((preset) => {
  const result = ExactCore.solvePuzzle(preset);
  if (!result.solved) fail(`${preset} puzzle should solve`);
  if (!ExactCore.validateBoard(result.board)) fail(`${preset} solution should be a valid Sudoku board`);
  ['decisions', 'backtracks', 'maxDepth', 'givens', 'solutionRows'].forEach((metric) => {
    const value = result.stats[metric];
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Metric ${metric} must be finite`);
  });
  if (result.stats.solutionRows !== 81 || result.stats.maxDepth < 40) fail(`${preset} search stats are not plausible`);
});

const hard = ExactCore.solvePuzzle('hard');
console.log(`Project 024 test passed: hard puzzle solved with ${hard.stats.decisions} decisions and ${hard.stats.backtracks} backtracks`);
