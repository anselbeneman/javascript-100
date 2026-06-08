(function () {
  'use strict';

  const DEFAULT_LIMIT = 120;
  const DEFAULT_WARMUP = 12;
  const DEFAULT_MIN_SAMPLES = 24;
  const FLOAT_FIELD_COUNT = 15;
  const UINT8_FIELD_COUNT = 2;
  const RGBA_BYTES_PER_CELL = 4;
  const BYTES_PER_MIB = 1024 * 1024;
  const GRID_STEPS = [80, 96, 128, 160];
  const MIN_PRESSURE_PASSES = 8;
  const MIN_VORTICITY = 8;
  const HOT_MIN_SOURCE = 20;
  const WARM_MIN_SOURCE = 24;

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function createTelemetryState(limit = DEFAULT_LIMIT, warmup = DEFAULT_WARMUP, minSamples = DEFAULT_MIN_SAMPLES) {
    const warmupSamples = Math.max(0, Math.round(toFiniteNumber(warmup, DEFAULT_WARMUP)));

    return {
      limit: Math.max(12, Math.round(toFiniteNumber(limit, DEFAULT_LIMIT))),
      warmup: warmupSamples,
      warmupRemaining: warmupSamples,
      minSamples: Math.max(1, Math.round(toFiniteNumber(minSamples, DEFAULT_MIN_SAMPLES))),
      samples: [],
    };
  }

  function resetTelemetry(state) {
    if (!state || !Array.isArray(state.samples)) {
      return;
    }

    state.samples.length = 0;
    state.warmupRemaining = Math.max(0, Math.round(toFiniteNumber(state.warmup, DEFAULT_WARMUP)));
  }

  function estimateSimulationMemoryMiB(settings) {
    const resolution = Math.max(1, Math.round(toFiniteNumber(settings && settings.resolution, 80)));
    const cells = resolution * resolution;
    const bytesPerCell = (FLOAT_FIELD_COUNT * Float32Array.BYTES_PER_ELEMENT)
      + UINT8_FIELD_COUNT
      + RGBA_BYTES_PER_CELL;

    return (cells * bytesPerCell) / BYTES_PER_MIB;
  }

  function targetStepMs(settings) {
    const resolution = Math.max(1, Math.round(toFiniteNumber(settings && settings.resolution, 80)));

    if (resolution <= 96) {
      return 45;
    }

    if (resolution <= 128) {
      return 60;
    }

    return 80;
  }

  function percentile(sortedValues, percentileValue) {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (sortedValues.length - 1) * percentileValue;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const ratio = index - lower;
    return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio;
  }

  function average(values) {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function summarizeTelemetry(state, settings) {
    const samples = state && Array.isArray(state.samples) ? state.samples : [];
    const stepValues = samples.map((sample) => sample.stepMs).filter(Number.isFinite).sort((a, b) => a - b);
    const fpsValues = samples.map((sample) => sample.fps).filter((value) => Number.isFinite(value) && value > 0);
    const minSamples = Math.max(1, Math.round(toFiniteNumber(state && state.minSamples, DEFAULT_MIN_SAMPLES)));
    const budgetMs = targetStepMs(settings);
    const p95StepMs = percentile(stepValues, 0.95);
    const stable = stepValues.length >= minSamples;
    let budgetState = 'idle';
    let budgetLabel = 'Collecting';

    if (stable) {
      if (p95StepMs <= budgetMs) {
        budgetState = 'ok';
        budgetLabel = 'Budget OK';
      } else if (p95StepMs <= budgetMs * 1.35) {
        budgetState = 'warm';
        budgetLabel = 'Budget Warm';
      } else {
        budgetState = 'hot';
        budgetLabel = 'Budget Hot';
      }
    }

    return {
      samples: samples.length,
      warmupRemaining: Math.max(0, Math.round(toFiniteNumber(state && state.warmupRemaining, 0))),
      minSamples,
      stable,
      avgStepMs: average(stepValues),
      p95StepMs,
      worstStepMs: stepValues.length > 0 ? stepValues[stepValues.length - 1] : 0,
      avgFps: average(fpsValues),
      minFps: fpsValues.length > 0 ? Math.min(...fpsValues) : 0,
      memoryMiB: estimateSimulationMemoryMiB(settings),
      budgetMs,
      budgetState,
      budgetLabel,
    };
  }

  function recordFrame(state, diagnostics, fps, settings) {
    if (!state || !Array.isArray(state.samples)) {
      return summarizeTelemetry(state, settings);
    }

    const safeDiagnostics = diagnostics && typeof diagnostics === 'object' ? diagnostics : {};

    if (state.warmupRemaining > 0) {
      state.warmupRemaining -= 1;
      return summarizeTelemetry(state, settings);
    }

    state.samples.push({
      stepMs: toFiniteNumber(safeDiagnostics.stepMs, 0),
      fps: toFiniteNumber(fps, 0),
      maxDensity: toFiniteNumber(safeDiagnostics.maxDensity, 0),
      maxSpeed: toFiniteNumber(safeDiagnostics.maxSpeed, 0),
      avgDivergence: toFiniteNumber(safeDiagnostics.avgDivergence, 0),
    });

    while (state.samples.length > state.limit) {
      state.samples.shift();
    }

    return summarizeTelemetry(state, settings);
  }

  function normalizeTelemetry(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return {
      samples: Math.max(0, Math.round(toFiniteNumber(value.samples, 0))),
      warmupRemaining: Math.max(0, Math.round(toFiniteNumber(value.warmupRemaining, 0))),
      minSamples: Math.max(1, Math.round(toFiniteNumber(value.minSamples, DEFAULT_MIN_SAMPLES))),
      stable: Boolean(value.stable),
      avgStepMs: toFiniteNumber(value.avgStepMs, 0),
      p95StepMs: toFiniteNumber(value.p95StepMs, 0),
      worstStepMs: toFiniteNumber(value.worstStepMs, 0),
      avgFps: toFiniteNumber(value.avgFps, 0),
      minFps: toFiniteNumber(value.minFps, 0),
      memoryMiB: toFiniteNumber(value.memoryMiB, 0),
      budgetMs: toFiniteNumber(value.budgetMs, 0),
      budgetState: String(value.budgetState || 'idle'),
      budgetLabel: String(value.budgetLabel || 'Collecting'),
    };
  }

  function normalizeBenchmark(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return {
      frames: Math.max(0, Math.round(toFiniteNumber(value.frames, 0))),
      p95StepMs: toFiniteNumber(value.p95StepMs, 0),
      avgStepMs: toFiniteNumber(value.avgStepMs, 0),
      stabilityScore: toFiniteNumber(value.stabilityScore, 0),
    };
  }

  function previousGrid(value) {
    const resolution = Math.max(1, Math.round(toFiniteNumber(value, 80)));
    const index = GRID_STEPS.findIndex((grid) => grid >= resolution);

    if (index <= 0) {
      return GRID_STEPS[0];
    }

    return GRID_STEPS[index - 1];
  }

  function settingsToControls(settings) {
    const safeSettings = settings && typeof settings === 'object' ? settings : {};

    return {
      profileSelect: 'custom',
      displaySelect: safeSettings.displayMode || 'dye',
      resolutionSelect: String(Math.max(80, Math.round(toFiniteNumber(safeSettings.resolution, 80)))),
      pressureRange: String(Math.max(6, Math.round(toFiniteNumber(safeSettings.pressureIterations, 14)))),
      swirlRange: String(Math.max(0, Math.round(toFiniteNumber(safeSettings.vorticity, 22)))),
      sourceRange: String(Math.max(0, Math.round(toFiniteNumber(safeSettings.sourceStrength, 0.42) * 100))),
      vectorToggle: Boolean(safeSettings.vectorOverlay),
    };
  }

  function buildPerformanceAdvice(settings, telemetry, benchmark) {
    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const safeTelemetry = normalizeTelemetry(telemetry);
    const safeBenchmark = normalizeBenchmark(benchmark);
    const budgetMs = safeTelemetry && safeTelemetry.budgetMs > 0
      ? safeTelemetry.budgetMs
      : targetStepMs(safeSettings);
    const benchmarkP95 = safeBenchmark && safeBenchmark.p95StepMs > 0 ? safeBenchmark.p95StepMs : 0;
    const telemetryP95 = safeTelemetry && safeTelemetry.stable && safeTelemetry.p95StepMs > 0
      ? safeTelemetry.p95StepMs
      : 0;
    const p95StepMs = benchmarkP95 || telemetryP95;
    const source = benchmarkP95 > 0 ? 'benchmark' : telemetryP95 > 0 ? 'telemetry' : 'none';
    const sourceLabel = source === 'benchmark' ? 'Benchmark' : 'Telemetry';

    if (p95StepMs <= 0) {
      return {
        severity: 'collecting',
        title: 'Collect samples',
        action: 'Run the scene or benchmark before tuning',
        reason: 'No benchmark or stable telemetry sample is available yet.',
        source,
        budgetMs,
        measuredP95Ms: p95StepMs,
        p95StepMs,
      };
    }

    const ratio = p95StepMs / Math.max(1, budgetMs);

    if (ratio > 1.35) {
      return {
        severity: 'hot',
        title: 'Reduce solver load',
        action: 'Lower grid or solver intensity',
        reason: `${sourceLabel} P95 ${p95StepMs.toFixed(1)} ms exceeds the ${budgetMs.toFixed(0)} ms budget.`,
        source,
        budgetMs,
        measuredP95Ms: p95StepMs,
        p95StepMs,
      };
    }

    if (ratio > 1) {
      return {
        severity: 'warm',
        title: 'Trim solver cost',
        action: 'Reduce pressure passes and emitters',
        reason: `${sourceLabel} P95 ${p95StepMs.toFixed(1)} ms is above the ${budgetMs.toFixed(0)} ms budget.`,
        source,
        budgetMs,
        measuredP95Ms: p95StepMs,
        p95StepMs,
      };
    }

    return {
      severity: 'ok',
      title: 'Keep current quality',
      action: 'No tuning required',
      reason: `${sourceLabel} P95 ${p95StepMs.toFixed(1)} ms is within the ${budgetMs.toFixed(0)} ms budget.`,
      source,
      budgetMs,
      measuredP95Ms: p95StepMs,
      p95StepMs,
    };
  }

  function createTunedControlValues(settings, telemetry, benchmark) {
    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const advice = buildPerformanceAdvice(safeSettings, telemetry, benchmark);
    const controls = settingsToControls(safeSettings);
    const original = JSON.stringify(controls);

    if (advice.severity === 'hot') {
      controls.resolutionSelect = String(previousGrid(safeSettings.resolution));
      controls.pressureRange = String(Math.max(MIN_PRESSURE_PASSES, Math.round(toFiniteNumber(safeSettings.pressureIterations, 14)) - 6));
      controls.swirlRange = String(Math.max(MIN_VORTICITY, Math.round(toFiniteNumber(safeSettings.vorticity, 22)) - 8));
      controls.sourceRange = String(Math.max(HOT_MIN_SOURCE, Math.round(toFiniteNumber(safeSettings.sourceStrength, 0.42) * 100) - 12));
      controls.vectorToggle = false;
    } else if (advice.severity === 'warm') {
      controls.pressureRange = String(Math.max(MIN_PRESSURE_PASSES, Math.round(toFiniteNumber(safeSettings.pressureIterations, 14)) - 3));
      controls.swirlRange = String(Math.max(MIN_VORTICITY, Math.round(toFiniteNumber(safeSettings.vorticity, 22)) - 4));
      controls.sourceRange = String(Math.max(WARM_MIN_SOURCE, Math.round(toFiniteNumber(safeSettings.sourceStrength, 0.42) * 100) - 6));
      controls.vectorToggle = false;
    }

    return {
      advice,
      changed: JSON.stringify(controls) !== original,
      controlValues: controls,
    };
  }

  window.FluidTelemetryTools = Object.freeze({
    buildPerformanceAdvice,
    createTunedControlValues,
    createTelemetryState,
    estimateSimulationMemoryMiB,
    normalizeTelemetry,
    recordFrame,
    resetTelemetry,
    summarizeTelemetry,
    targetStepMs,
  });
}());
