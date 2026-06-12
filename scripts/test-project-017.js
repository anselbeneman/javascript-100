const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '017', 'collision-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.CollisionCore;
}

const CollisionCore = loadCore();
const bodyA = CollisionCore.createBody({
  id: 'a',
  sides: 4,
  radius: 0.12,
  x: 0.48,
  y: 0.5,
  vx: 0.08,
  mass: 1,
});
const bodyB = CollisionCore.createBody({
  id: 'b',
  sides: 5,
  radius: 0.12,
  x: 0.56,
  y: 0.5,
  vx: -0.08,
  mass: 1.2,
});
const collision = CollisionCore.testCollision(bodyA, bodyB);

if (!collision.colliding || collision.penetration <= 0) {
  fail('Overlapping convex bodies should collide with positive penetration');
}

CollisionCore.resolveCollision(bodyA, bodyB, collision, 0.65);
const separated = CollisionCore.testCollision(bodyA, bodyB);

if (!Number.isFinite(separated.penetration)) {
  fail('SAT separation result should remain finite');
}

const summaryA = CollisionCore.summarize({
  count: 8,
  frames: 140,
  restitution: 0.62,
  seed: 1701,
});
const summaryB = CollisionCore.summarize({
  count: 8,
  frames: 140,
  restitution: 0.62,
  seed: 1701,
});

if (JSON.stringify(summaryA.metrics) !== JSON.stringify(summaryB.metrics)) {
  fail('Collision summary should be deterministic for the same seed');
}

['bodies', 'pairCount', 'maxContacts', 'averageContacts', 'maxPenetration', 'energy'].forEach((metric) => {
  const value = summaryA.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Collision metric ${metric} must be finite`);
  }
});

if (summaryA.metrics.bodies !== 9 || summaryA.metrics.pairCount !== 36) {
  fail(`Unexpected collision scene dimensions: ${summaryA.metrics.bodies} bodies, ${summaryA.metrics.pairCount} pairs`);
}

console.log(`Project 017 test passed: ${summaryA.metrics.bodies} bodies, max contacts ${summaryA.metrics.maxContacts}, energy ${summaryA.metrics.energy.toFixed(4)}`);
