(function attachParticlePhysicsTools(global) {
  'use strict';

  const version = 1;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function toFixedNumber(value, digits) {
    return Number(finiteOr(value, 0).toFixed(digits));
  }

  function hashString(input) {
    let hash = 2166136261;

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `psx-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function summarizeSettings(settings, seed) {
    return {
      preset: settings.preset,
      count: settings.count,
      radius: toFixedNumber(settings.radius, 2),
      gravity: toFixedNumber(settings.gravity, 3),
      drag: toFixedNumber(settings.drag, 4),
      restitution: toFixedNumber(settings.restitution, 3),
      pointerForce: toFixedNumber(settings.pointerForce, 3),
      pointerMode: settings.pointerMode,
      collisions: settings.collisions,
      trails: settings.trails,
      showGrid: settings.showGrid,
      seed: Math.floor(finiteOr(seed, 1)) >>> 0,
    };
  }

  function summarizeMetrics(metrics) {
    const source = metrics || {};

    return {
      particles: Math.round(finiteOr(source.particles, 0)),
      averageEnergy: toFixedNumber(source.averageEnergy, 3),
      maxSpeed: toFixedNumber(source.maxSpeed, 3),
      checks: Math.round(finiteOr(source.checks, 0)),
      collisions: Math.round(finiteOr(source.collisions, 0)),
      gridCells: Math.round(finiteOr(source.gridCells, 0)),
      spread: toFixedNumber(source.spread, 4),
      centerX: toFixedNumber(source.centerX, 2),
      centerY: toFixedNumber(source.centerY, 2),
    };
  }

  function createStateFingerprint(settings, seed, metrics) {
    return hashString(JSON.stringify({
      settings: summarizeSettings(settings, seed),
      metrics: summarizeMetrics(metrics),
    }));
  }

  function createExportPayload({ settings, seed, metrics, benchmark }) {
    const summary = summarizeSettings(settings, seed);
    const metricSummary = summarizeMetrics(metrics);

    return {
      version,
      type: 'particle-physics-sandbox',
      exportedAt: new Date().toISOString(),
      fingerprint: createStateFingerprint(settings, seed, metrics),
      seed: summary.seed,
      settings: summary,
      metrics: metricSummary,
      benchmark: benchmark || null,
    };
  }

  function settingsToControlValues(settings, seed) {
    const normalizedSeed = Math.floor(finiteOr(seed, 1)) >>> 0;

    return {
      seed: normalizedSeed || 1,
      presetSelect: settings.preset,
      pointerModeSelect: settings.pointerMode,
      countRange: String(settings.count),
      radiusRange: String(toFixedNumber(settings.radius, 1)),
      gravityRange: String(Math.round(settings.gravity * 100)),
      dragRange: String(Math.round(settings.drag * 1000)),
      restitutionRange: String(Math.round(settings.restitution * 100)),
      pointerForceRange: String(Math.round(settings.pointerForce * 100)),
      collisionToggle: Boolean(settings.collisions),
      trailToggle: Boolean(settings.trails),
      gridToggle: Boolean(settings.showGrid),
    };
  }

  function normalizeImportPayload(input, core) {
    let payload = input;

    if (typeof input === 'string') {
      payload = JSON.parse(input);
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Import payload must be an object');
    }

    const sourceSettings = payload.settings && typeof payload.settings === 'object'
      ? payload.settings
      : payload;
    const seed = Math.floor(finiteOr(payload.seed || sourceSettings.seed, 1)) >>> 0;
    const settings = core.normalizeSettings(sourceSettings);

    return {
      seed: seed || 1,
      settings,
      controls: settingsToControlValues(settings, seed || 1),
      fingerprint: payload.fingerprint || createStateFingerprint(settings, seed || 1, payload.metrics),
    };
  }

  function createShareHash(settings, seed) {
    const summary = summarizeSettings(settings, seed);
    const params = new URLSearchParams();

    params.set('v', String(version));
    params.set('preset', summary.preset);
    params.set('seed', String(summary.seed));
    params.set('count', String(summary.count));
    params.set('radius', String(summary.radius));
    params.set('gravity', String(summary.gravity));
    params.set('drag', String(summary.drag));
    params.set('bounce', String(summary.restitution));
    params.set('force', String(summary.pointerForce));
    params.set('mode', summary.pointerMode);
    params.set('collisions', summary.collisions ? '1' : '0');
    params.set('trails', summary.trails ? '1' : '0');
    params.set('grid', summary.showGrid ? '1' : '0');

    return `#${params.toString()}`;
  }

  function parseShareHash(hash, core) {
    const cleanHash = String(hash || '').replace(/^#/, '');

    if (!cleanHash) {
      return null;
    }

    const params = new URLSearchParams(cleanHash);

    if (!params.has('preset') && !params.has('seed')) {
      return null;
    }

    const settings = core.normalizeSettings({
      preset: params.get('preset'),
      count: Number(params.get('count')),
      radius: Number(params.get('radius')),
      gravity: Number(params.get('gravity')),
      drag: Number(params.get('drag')),
      restitution: Number(params.get('bounce')),
      pointerForce: Number(params.get('force')),
      pointerMode: params.get('mode'),
      collisions: params.get('collisions') !== '0',
      trails: params.get('trails') !== '0',
      showGrid: params.get('grid') === '1',
    });
    const seed = Math.floor(finiteOr(Number(params.get('seed')), 1)) >>> 0;

    return {
      seed: seed || 1,
      settings,
      controls: settingsToControlValues(settings, seed || 1),
    };
  }

  function percentile(sortedValues, ratio) {
    if (!sortedValues.length) {
      return 0;
    }

    const index = clamp(Math.ceil(sortedValues.length * ratio) - 1, 0, sortedValues.length - 1);
    return sortedValues[index];
  }

  function createBenchmarkPointer(frame, settings) {
    const angle = frame * 0.19;
    const radiusX = settings.width * 0.22;
    const radiusY = settings.height * 0.18;

    return {
      active: true,
      down: frame % 6 < 3,
      x: settings.width * 0.5 + Math.cos(angle) * radiusX,
      y: settings.height * 0.5 + Math.sin(angle * 1.3) * radiusY,
      mode: frame % 45 < 15 ? 'attract' : frame % 45 < 30 ? 'stir' : 'repel',
    };
  }

  function runBenchmark(core, rawSettings, options = {}) {
    const frames = clamp(Math.round(finiteOr(options.frames, 120)), 20, 600);
    const warmup = clamp(Math.round(finiteOr(options.warmup, 16)), 0, 120);
    const seed = Math.floor(finiteOr(options.seed, 19003)) >>> 0;
    const now = typeof options.now === 'function'
      ? options.now
      : () => (global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now());
    const settings = core.normalizeSettings({
      ...rawSettings,
      width: finiteOr(options.width, rawSettings.width || 960),
      height: finiteOr(options.height, rawSettings.height || 540),
    });
    const world = core.createWorld(settings, seed || 1);
    const timings = [];
    let collisionTotal = 0;
    let checkTotal = 0;
    let latestMetrics = world.metrics;

    core.createBurst(world, settings, settings.width * 0.5, settings.height * 0.35, Math.round(settings.count / 4), 420, seed + 33);

    for (let frame = 0; frame < warmup + frames; frame += 1) {
      const start = now();
      latestMetrics = core.stepSimulation(world, settings, 1 / 60, createBenchmarkPointer(frame, settings));
      const elapsed = Math.max(0, now() - start);

      if (frame >= warmup) {
        timings.push(elapsed);
        collisionTotal += latestMetrics.collisions;
        checkTotal += latestMetrics.checks;
      }
    }

    const sorted = timings.slice().sort((a, b) => a - b);
    const total = timings.reduce((sum, value) => sum + value, 0);
    const average = timings.length > 0 ? total / timings.length : 0;
    const worst = sorted.length ? sorted[sorted.length - 1] : 0;
    const variance = timings.length > 0
      ? timings.reduce((sum, value) => sum + (value - average) ** 2, 0) / timings.length
      : 0;
    const p95 = percentile(sorted, 0.95);

    return {
      frames,
      warmup,
      seed: seed || 1,
      avgStepMs: toFixedNumber(average, 3),
      medianStepMs: toFixedNumber(percentile(sorted, 0.5), 3),
      p95StepMs: toFixedNumber(p95, 3),
      worstStepMs: toFixedNumber(worst, 3),
      stdDevStepMs: toFixedNumber(Math.sqrt(variance), 3),
      stabilityScore: toFixedNumber(clamp(100 - (p95 - average) * 14 - Math.sqrt(variance) * 7, 0, 100), 1),
      totalCollisions: collisionTotal,
      avgChecks: toFixedNumber(checkTotal / Math.max(1, frames), 1),
      finalEnergy: toFixedNumber(latestMetrics.averageEnergy, 3),
      fingerprint: createStateFingerprint(settings, seed || 1, latestMetrics),
    };
  }

  function buildTechnicalReport({ settings, seed, metrics, benchmark }) {
    const summary = summarizeSettings(settings, seed);
    const metricSummary = summarizeMetrics(metrics);
    const benchmarkLine = benchmark
      ? `Benchmark: ${benchmark.frames} frames, avg ${benchmark.avgStepMs} ms, P95 ${benchmark.p95StepMs} ms, stability ${benchmark.stabilityScore}/100.`
      : 'Benchmark: not run.';

    return [
      '# 003 - Particle Physics Sandbox Report',
      '',
      `Fingerprint: ${createStateFingerprint(settings, seed, metrics)}`,
      `Preset: ${summary.preset}`,
      `Seed: ${summary.seed}`,
      `Particles: ${summary.count}`,
      `Radius: ${summary.radius}px`,
      `Gravity: ${summary.gravity}`,
      `Drag: ${summary.drag}`,
      `Bounce: ${summary.restitution}`,
      `Pointer: ${summary.pointerMode} at ${summary.pointerForce}`,
      `Collisions: ${summary.collisions ? 'on' : 'off'}`,
      '',
      `Live metrics: energy ${metricSummary.averageEnergy}, max speed ${metricSummary.maxSpeed}, checks ${metricSummary.checks}, hits ${metricSummary.collisions}, cells ${metricSummary.gridCells}, spread ${metricSummary.spread}.`,
      benchmarkLine,
      '',
      'Technical notes: deterministic seeded setup, spatial-grid broad phase, impulse collision resolution, pointer-force field, and Canvas 2D renderer stay separated from import/export and benchmark helpers.',
    ].join('\n');
  }

  global.ParticlePhysicsTools = Object.freeze({
    version,
    hashString,
    summarizeSettings,
    summarizeMetrics,
    createStateFingerprint,
    createExportPayload,
    normalizeImportPayload,
    settingsToControlValues,
    createShareHash,
    parseShareHash,
    runBenchmark,
    buildTechnicalReport,
  });
}(typeof window !== 'undefined' ? window : globalThis));
