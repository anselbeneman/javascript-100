const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '019', 'flock-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.FlockCore;
}

const FlockCore = loadCore();
const summaryA = FlockCore.summarize({
  preset: 'swarm',
  count: 180,
  frames: 150,
  perception: 0.11,
  maxSpeed: 0.34,
  seed: 1901,
});
const summaryB = FlockCore.summarize({
  preset: 'swarm',
  count: 180,
  frames: 150,
  perception: 0.11,
  maxSpeed: 0.34,
  seed: 1901,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Flocking summary should be deterministic for the same seed');
}

['averageSpeed', 'polarization', 'centerSpread', 'neighborChecks', 'averageNeighbors', 'searchReduction'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Flocking metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.agents !== 180 || summaryA.scene.agents.length !== 180) {
  fail('Flocking scene should preserve the configured agent count');
}

if (summaryA.metrics.averageNeighbors <= 0 || summaryA.metrics.searchReduction < 0.55) {
  fail(`Spatial hash should find neighbors while reducing checks, received neighbors ${summaryA.metrics.averageNeighbors} and reduction ${summaryA.metrics.searchReduction}`);
}

if (summaryA.history.length < 20) {
  fail('Flocking summary should include a useful history trace');
}

console.log(`Project 019 test passed: ${summaryA.metrics.agents} agents, ${(summaryA.metrics.searchReduction * 100).toFixed(1)}% fewer checks`);
