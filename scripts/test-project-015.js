const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '015', 'genetic-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.GeneticCore;
}

const GeneticCore = loadCore();
const resultA = GeneticCore.runEvolution({
  cityCount: 30,
  populationSize: 84,
  generations: 150,
  mutationRate: 0.16,
  seed: 1501,
});
const resultB = GeneticCore.runEvolution({
  cityCount: 30,
  populationSize: 84,
  generations: 150,
  mutationRate: 0.16,
  seed: 1501,
});

if (JSON.stringify(resultA.history) !== JSON.stringify(resultB.history)) {
  fail('Genetic optimizer should be deterministic for the same seed');
}

if (!GeneticCore.isValidRoute(resultA.bestRoute, resultA.cities.length)) {
  fail('Best route must contain every city exactly once');
}

['bestLength', 'initialBestLength', 'baselineLength', 'improvement', 'baselineGap'].forEach((metric) => {
  const value = resultA[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Genetic metric ${metric} must be finite`);
  }
});

if (resultA.bestLength >= resultA.initialBestLength) {
  fail(`Expected evolution to improve route length: ${resultA.initialBestLength} -> ${resultA.bestLength}`);
}

if (resultA.improvement < 0.08) {
  fail(`Expected at least 8% route improvement, received ${(resultA.improvement * 100).toFixed(1)}%`);
}

if (resultA.history.length !== 151) {
  fail(`Expected generation history to include generation 0, received ${resultA.history.length} points`);
}

console.log(`Project 015 test passed: route ${resultA.initialBestLength.toFixed(3)} -> ${resultA.bestLength.toFixed(3)} (${(resultA.improvement * 100).toFixed(1)}%)`);
