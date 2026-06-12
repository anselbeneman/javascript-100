const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '021', 'sdf-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date, Uint8ClampedArray });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.SdfCore;
}

const SdfCore = loadCore();
const frameA = SdfCore.render({
  preset: 'fusion',
  width: 96,
  height: 54,
  maxSteps: 72,
  time: 0.35,
});
const frameB = SdfCore.render({
  preset: 'fusion',
  width: 96,
  height: 54,
  maxSteps: 72,
  time: 0.35,
});

if (JSON.stringify(frameA.metrics) !== JSON.stringify(frameB.metrics)) {
  fail('SDF render should be deterministic for the same settings');
}

if (!(frameA.pixels instanceof Uint8ClampedArray) || frameA.pixels.length !== 96 * 54 * 4) {
  fail('SDF render should return a valid RGBA pixel buffer');
}

['hitRatio', 'averageSteps', 'maxSteps', 'colorEnergy'].forEach((metric) => {
  const value = frameA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`SDF metric ${metric} must be finite`);
  }
});

if (frameA.metrics.hitRatio <= 0.05 || frameA.metrics.hitRatio >= 0.9) {
  fail(`SDF render should hit a meaningful portion of the scene, received ${frameA.metrics.hitRatio}`);
}

if (frameA.metrics.colorEnergy <= 20 || frameA.metrics.averageSteps <= 2) {
  fail('SDF render should produce visible color energy and non-trivial marching work');
}

console.log(`Project 021 test passed: hit ${(frameA.metrics.hitRatio * 100).toFixed(1)}%, avg steps ${frameA.metrics.averageSteps.toFixed(2)}`);
