const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');

function createBrowserContext() {
  return vm.createContext({
    window: {},
    Math,
    Number,
    Object,
    Date,
    URLSearchParams,
  });
}

function loadBrowserGlobal(context, relativePath, globalName) {
  const scriptPath = path.join(rootDir, relativePath);

  vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
    filename: relativePath,
  });

  assert.ok(context.window[globalName], `${relativePath} must expose window.${globalName}`);
  return context.window[globalName];
}

const browserContext = createBrowserContext();
const core = loadBrowserGlobal(browserContext, path.join('003', 'physics-core.js'), 'ParticlePhysicsCore');
const tools = loadBrowserGlobal(browserContext, path.join('003', 'analysis-tools.js'), 'ParticlePhysicsTools');

function createSettings(overrides = {}) {
  return core.normalizeSettings({
    preset: 'orbit',
    width: 800,
    height: 480,
    count: 180,
    radius: 4,
    gravity: 0.1,
    drag: 0.995,
    restitution: 0.82,
    pointerForce: 0.9,
    collisions: true,
    ...overrides,
  });
}

function snapshot(world) {
  return world.particles.slice(0, 10).map((particle) => [
    Number(particle.x.toFixed(3)),
    Number(particle.y.toFixed(3)),
    Number(particle.vx.toFixed(3)),
    Number(particle.vy.toFixed(3)),
    Number(particle.radius.toFixed(3)),
  ]);
}

function assertFiniteMetric(metrics, field) {
  assert.strictEqual(typeof metrics[field], 'number', `${field} must be numeric`);
  assert.ok(Number.isFinite(metrics[field]), `${field} must be finite`);
}

function testDeterminismAndCollisions() {
  const settings = createSettings({ preset: 'granular', count: 220, gravity: 0.68 });
  const first = core.createWorld(settings, 5150);
  const second = core.createWorld(settings, 5150);
  let metrics = null;

  assert.deepStrictEqual(snapshot(first), snapshot(second), 'seeded worlds must match');
  core.createBurst(first, settings, settings.width * 0.5, settings.height * 0.22, 80, 360, 99);

  for (let frame = 0; frame < 54; frame += 1) {
    metrics = core.stepSimulation(first, settings, 1 / 60, {
      active: frame % 2 === 0,
      down: frame % 5 === 0,
      x: settings.width * 0.5,
      y: settings.height * 0.38,
      mode: 'stir',
    });
  }

  ['particles', 'energy', 'averageEnergy', 'maxSpeed', 'checks', 'collisions', 'gridCells', 'spread'].forEach((field) => {
    assertFiniteMetric(metrics, field);
  });

  assert.strictEqual(metrics.particles, settings.count);
  assert.ok(metrics.energy > 0, 'simulation energy must be positive');
  assert.ok(metrics.checks > 0, 'collision grid must perform nearby checks');
  assert.ok(metrics.collisions > 0, 'clustered burst should create collisions');
  assert.ok(metrics.gridCells > 0, 'spatial grid must occupy cells');
}

function testImportExportShareAndReport() {
  const settings = createSettings({
    preset: 'magnetic',
    count: 160,
    radius: 3.8,
    gravity: 0.04,
    pointerMode: 'repel',
    trails: false,
    showGrid: true,
  });
  const world = core.createWorld(settings, 1203);
  const metrics = core.stepSimulation(world, settings, 1 / 60, { active: false });
  const payload = tools.createExportPayload({ settings, seed: 1203, metrics, benchmark: null });
  const imported = tools.normalizeImportPayload(JSON.stringify(payload), core);
  const parsedShare = tools.parseShareHash(tools.createShareHash(settings, 1203), core);

  assert.strictEqual(payload.type, 'particle-physics-sandbox');
  assert.match(payload.fingerprint, /^psx-[0-9a-f]{8}$/);
  assert.strictEqual(imported.seed, 1203);
  assert.strictEqual(imported.settings.preset, settings.preset);
  assert.strictEqual(imported.controls.gridToggle, true);
  assert.strictEqual(parsedShare.seed, 1203);
  assert.strictEqual(parsedShare.settings.pointerMode, 'repel');
  assert.strictEqual(parsedShare.controls.trailToggle, false);
}

function testBenchmarkContract() {
  const settings = createSettings({ preset: 'granular', count: 180, gravity: 0.72 });
  let clock = 100;
  const benchmark = tools.runBenchmark(core, settings, {
    seed: 991,
    frames: 40,
    warmup: 4,
    width: 720,
    height: 420,
    now: () => {
      clock += 0.37;
      return clock;
    },
  });
  const world = core.createWorld(settings, 991);
  const metrics = core.stepSimulation(world, settings, 1 / 60, { active: false });
  const report = tools.buildTechnicalReport({ settings, seed: 991, metrics, benchmark });

  assert.strictEqual(benchmark.frames, 40);
  assert.ok(benchmark.p95StepMs >= benchmark.medianStepMs);
  assert.ok(benchmark.worstStepMs >= benchmark.p95StepMs);
  assert.ok(benchmark.stabilityScore >= 0 && benchmark.stabilityScore <= 100);
  assert.ok(benchmark.totalCollisions > 0);
  assert.match(benchmark.fingerprint, /^psx-[0-9a-f]{8}$/);
  assert.ok(report.includes('# 003 - Particle Physics Sandbox Report'));
  assert.ok(report.includes('Benchmark: 40 frames'));
  assert.ok(report.includes('spatial-grid broad phase'));
}

testDeterminismAndCollisions();
testImportExportShareAndReport();
testBenchmarkContract();

console.log('Project 003 unit tests passed');
