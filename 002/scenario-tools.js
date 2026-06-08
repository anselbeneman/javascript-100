(function () {
  'use strict';

  const DEFAULT_SCENARIO = 'twin-vortex';
  const SCENARIOS = Object.freeze({
    'twin-vortex': Object.freeze({
      id: 'twin-vortex',
      label: 'Twin Vortex',
      duration: 7.2,
    }),
    'shear-wake': Object.freeze({
      id: 'shear-wake',
      label: 'Shear Wake',
      duration: 7.8,
    }),
    'spiral-bloom': Object.freeze({
      id: 'spiral-bloom',
      label: 'Spiral Bloom',
      duration: 6.8,
    }),
  });

  function clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return min;
    }

    return Math.min(max, Math.max(min, number));
  }

  function normalizeScenarioId(value) {
    const id = String(value || DEFAULT_SCENARIO);
    return SCENARIOS[id] ? id : DEFAULT_SCENARIO;
  }

  function getScenario(value) {
    return SCENARIOS[normalizeScenarioId(value)];
  }

  function getScenarioOptions() {
    return Object.values(SCENARIOS).map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      duration: scenario.duration,
    }));
  }

  function pickColor(settings, offset) {
    const palette = settings && Array.isArray(settings.palette) && settings.palette.length > 0
      ? settings.palette
      : [[0.48, 1, 0.77]];
    const rawColor = palette[Math.abs(Math.floor(offset)) % palette.length] || palette[0];

    return [
      clamp(rawColor[0], 0, 1),
      clamp(rawColor[1], 0, 1),
      clamp(rawColor[2], 0, 1),
    ];
  }

  function makeSplat(x, y, dx, dy, pressure, color) {
    return {
      x: clamp(x, 0.02, 0.98),
      y: clamp(y, 0.02, 0.98),
      dx: clamp(dx, -0.08, 0.08),
      dy: clamp(dy, -0.08, 0.08),
      pressure: clamp(pressure, 0.2, 1.25),
      color,
    };
  }

  function pulse(elapsed, frequency, phase) {
    return 0.78 + 0.22 * Math.sin(elapsed * frequency + phase);
  }

  function generateTwinVortex(elapsed, settings) {
    const phase = elapsed * 2.15;
    const ringX = Math.cos(phase) * 0.255;
    const ringY = Math.sin(phase) * 0.205;
    const tangentX = -Math.sin(phase) * 0.026;
    const tangentY = Math.cos(phase) * 0.022;
    const boost = pulse(elapsed, 3.4, 0);

    return [
      makeSplat(0.5 + ringX, 0.52 + ringY, tangentX, tangentY, 0.9 * boost, pickColor(settings, elapsed)),
      makeSplat(0.5 - ringX, 0.52 - ringY, tangentX, tangentY, 0.9 * boost, pickColor(settings, elapsed + 1)),
      makeSplat(0.5, 0.52, -tangentX * 0.65, -tangentY * 0.65, 0.48, pickColor(settings, elapsed + 2)),
    ];
  }

  function generateShearWake(elapsed, settings) {
    const lane = 0.5 + Math.sin(elapsed * 1.55) * 0.19;
    const counterLane = 1 - lane;
    const vertical = Math.cos(elapsed * 1.18) * 0.017;
    const boost = pulse(elapsed, 2.6, 0.5);

    return [
      makeSplat(0.16, lane, 0.032, vertical, 0.86 * boost, pickColor(settings, elapsed)),
      makeSplat(0.84, counterLane, -0.032, -vertical, 0.86 * boost, pickColor(settings, elapsed + 1)),
      makeSplat(0.48, 0.24, 0.004, 0.03, 0.58, pickColor(settings, elapsed + 2)),
      makeSplat(0.52, 0.78, -0.004, -0.03, 0.58, pickColor(settings, elapsed + 3)),
    ];
  }

  function generateSpiralBloom(elapsed, settings) {
    const phase = elapsed * 2.55;
    const radius = 0.09 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 0.85));
    const splats = [];

    for (let arm = 0; arm < 4; arm += 1) {
      const angle = phase + arm * Math.PI * 0.5;
      const x = 0.5 + Math.cos(angle) * radius;
      const y = 0.52 + Math.sin(angle) * radius * 0.82;
      const dx = Math.cos(angle + Math.PI * 0.42) * 0.023;
      const dy = Math.sin(angle + Math.PI * 0.42) * 0.023;

      splats.push(makeSplat(x, y, dx, dy, 0.72, pickColor(settings, elapsed + arm)));
    }

    return splats;
  }

  function generateSplats(scenarioId, elapsed, settings) {
    const scenario = getScenario(scenarioId);
    const safeElapsed = Math.max(0, Number(elapsed) || 0);

    if (safeElapsed > scenario.duration) {
      return [];
    }

    if (scenario.id === 'shear-wake') {
      return generateShearWake(safeElapsed, settings);
    }

    if (scenario.id === 'spiral-bloom') {
      return generateSpiralBloom(safeElapsed, settings);
    }

    return generateTwinVortex(safeElapsed, settings);
  }

  window.FluidScenarioTools = Object.freeze({
    defaultScenario: DEFAULT_SCENARIO,
    getScenario,
    getScenarioOptions,
    generateSplats,
    normalizeScenarioId,
  });
}());
