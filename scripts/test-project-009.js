const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const ikCorePath = path.join(rootDir, '009', 'ik-core.js');

function loadIKCore() {
  const context = vm.createContext({
    window: {},
    Math,
  });

  vm.runInContext(fs.readFileSync(ikCorePath, 'utf8'), context, {
    filename: path.relative(rootDir, ikCorePath),
  });

  assert(context.window.IKCore, 'IKCore must be exposed on window');
  return context.window.IKCore;
}

const IKCore = loadIKCore();

function sceneOptions(overrides = {}) {
  return {
    preset: 'precision',
    width: 960,
    height: 540,
    segmentCount: 8,
    segmentLength: 58,
    seed: 9,
    ...overrides,
  };
}

function solverSettings(solver, scene, overrides = {}) {
  return {
    solver,
    maxIterations: 18,
    maxJointAngle: 126 * Math.PI / 180,
    clampJoints: true,
    avoidObstacles: true,
    obstaclePadding: 12,
    obstacles: scene.obstacles,
    tolerance: 1.2,
    ...overrides,
  };
}

function averageEndEffectorError(chains, target) {
  return chains.reduce((sum, chain) => (
    sum + IKCore.distance(chain.points[chain.points.length - 1], target)
  ), 0) / chains.length;
}

function maxSegmentLengthError(chain) {
  return chain.lengths.reduce((maxError, expectedLength, index) => {
    const actualLength = IKCore.distance(chain.points[index], chain.points[index + 1]);
    return Math.max(maxError, Math.abs(actualLength - expectedLength));
  }, 0);
}

function assertFiniteMetric(value, label) {
  assert.strictEqual(typeof value, 'number', `${label} must be numeric`);
  assert(Number.isFinite(value), `${label} must be finite`);
}

function solveFixture(solver, target = { x: 640, y: 250 }) {
  const scene = IKCore.createScene(sceneOptions());
  const beforeError = averageEndEffectorError(scene.chains, target);
  const result = IKCore.solveScene(scene.chains, target, solverSettings(solver, scene));

  return {
    scene,
    result,
    beforeError,
    afterError: result.metrics.averageError,
  };
}

assert.strictEqual(IKCore.presetLabel('precision'), 'Precision Rig');
assert.strictEqual(IKCore.solverLabel('fabrik'), 'FABRIK');
assert.strictEqual(IKCore.solverLabel('ccd'), 'CCD');
assert.strictEqual(IKCore.targetLabel('scan'), 'Figure Eight');

{
  const first = IKCore.createScene(sceneOptions({ seed: 123 }));
  const second = IKCore.createScene(sceneOptions({ seed: 123 }));
  const third = IKCore.createScene(sceneOptions({ seed: 124 }));

  assert.deepStrictEqual(first.chains[0].lengths, second.chains[0].lengths, 'same seed must produce the same rig');
  assert.notDeepStrictEqual(first.chains[0].lengths, third.chains[0].lengths, 'different seeds should change the rig');
  assert.strictEqual(first.chains.length, 3, 'precision preset should build 3 chains');
  assert.strictEqual(first.chains[0].points.length, 9, '8 segments should produce 9 joints');
  assert(first.obstacles.length > 0, 'precision preset should include obstacles');
}

['fabrik', 'ccd'].forEach((solver) => {
  const fixture = solveFixture(solver);

  assert(fixture.afterError < fixture.beforeError, `${solver} should reduce end-effector error`);
  assertFiniteMetric(fixture.result.metrics.averageError, `${solver} average error`);
  assertFiniteMetric(fixture.result.metrics.averageReachRatio, `${solver} reach ratio`);
  assertFiniteMetric(fixture.result.metrics.iterations, `${solver} iterations`);
  assert.strictEqual(fixture.result.metrics.joints, 27, `${solver} should keep the expected joint count`);

  fixture.result.chains.forEach((chain) => {
    assert(
      maxSegmentLengthError(chain) < 1e-6,
      `${solver} must preserve segment lengths after solving and constraints`,
    );
  });
});

{
  const scene = IKCore.createScene(sceneOptions({ preset: 'gantry' }));
  const target = { x: 2200, y: -900 };
  const result = IKCore.solveScene(scene.chains, target, solverSettings('fabrik', scene, {
    avoidObstacles: false,
    clampJoints: false,
  }));

  result.chains.forEach((chain) => {
    const reach = chain.lengths.reduce((sum, length) => sum + length, 0);
    const end = chain.points[chain.points.length - 1];
    assert(Math.abs(IKCore.distance(chain.root, end) - reach) < 1e-6, 'unreachable targets should fully extend the chain');
    assert.strictEqual(chain.reachRatio, 1, 'unreachable target should report full reach pressure');
  });
}

console.log('Project 009 unit tests passed');
