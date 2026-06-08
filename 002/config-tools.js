(function () {
  'use strict';

  const PROJECT_NAME = '002 - Fluid Simulation Studio';
  const DEFAULT_DIAGNOSTICS = Object.freeze({
    stepMs: 0,
    maxDensity: 0,
    maxSpeed: 0,
    avgDivergence: 0,
  });
  const SHARE_VERSION = '1';

  function toSafeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clampNumber(value, min, max, fallback) {
    const number = toFiniteNumber(value, fallback);
    return Math.min(max, Math.max(min, number));
  }

  function pickOption(value, options, fallback) {
    const normalizedValue = String(value);
    return Array.isArray(options) && options.includes(normalizedValue) ? normalizedValue : fallback;
  }

  function toBoolean(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return fallback;
  }

  function encodePair(key, value) {
    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  }

  function decodeShareParams(value) {
    const source = String(value || '').replace(/^#/, '').trim();
    const decoded = {};

    if (!source) {
      return decoded;
    }

    source.split('&').forEach((pair) => {
      const [rawKey, ...rawValue] = pair.split('=');
      const key = decodeURIComponent(rawKey || '').trim();

      if (!key) {
        return;
      }

      decoded[key] = decodeURIComponent(rawValue.join('=') || '');
    });

    return decoded;
  }

  function compactNumber(value, fallback, fractionDigits) {
    const number = toFiniteNumber(value, fallback);
    return Number(number.toFixed(fractionDigits)).toString();
  }

  function controlsFromSettings(settings, defaults, options) {
    const safeSettings = toSafeObject(settings);
    const safeDefaults = toSafeObject(defaults);
    const safeOptions = toSafeObject(options);

    return {
      profileSelect: pickOption(safeSettings.profile, safeOptions.profiles, 'custom'),
      presetSelect: pickOption(safeSettings.preset, safeOptions.presets, safeDefaults.presetSelect),
      displaySelect: pickOption(safeSettings.displayMode, safeOptions.displayModes, safeDefaults.displaySelect),
      resolutionSelect: pickOption(safeSettings.resolution, safeOptions.resolutions, safeDefaults.resolutionSelect),
      scenarioSelect: pickOption(safeSettings.scenario, safeOptions.scenarios, safeDefaults.scenarioSelect),
      forceRange: String(clampNumber(safeSettings.force, 300, 2200, Number(safeDefaults.forceRange))),
      radiusRange: String(clampNumber(Number(safeSettings.radius) * 100, 2, 12, Number(safeDefaults.radiusRange))),
      dissipationRange: String(clampNumber(Number(safeSettings.dissipation) * 100, 94, 99.5, Number(safeDefaults.dissipationRange))),
      velocityDecayRange: String(clampNumber(Number(safeSettings.velocityDecay) * 100, 96, 99.9, Number(safeDefaults.velocityDecayRange))),
      pressureRange: String(clampNumber(safeSettings.pressureIterations, 6, 32, Number(safeDefaults.pressureRange))),
      swirlRange: String(clampNumber(safeSettings.vorticity, 0, 50, Number(safeDefaults.swirlRange))),
      sourceRange: String(clampNumber(Number(safeSettings.sourceStrength) * 100, 0, 100, Number(safeDefaults.sourceRange))),
      vectorToggle: toBoolean(safeSettings.vectorOverlay, false),
      brushToggle: toBoolean(safeSettings.brushOverlay, true),
      obstacleToggle: toBoolean(safeSettings.obstacle, true),
      glowToggle: toBoolean(safeSettings.glow, true),
      traceToggle: toBoolean(safeSettings.traceOverlay, true),
    };
  }

  function normalizeBenchmark(value) {
    const benchmark = toSafeObject(value);
    const avgStepMs = Number(benchmark.avgStepMs);

    if (!Number.isFinite(avgStepMs)) {
      return null;
    }

    const frames = Math.max(0, Math.round(toFiniteNumber(benchmark.frames, 0)));
    const histogram = Array.isArray(benchmark.histogram)
      ? benchmark.histogram
        .map((bucket) => ({
          label: String(bucket && bucket.label ? bucket.label : 'unknown'),
          count: Math.max(0, Math.round(toFiniteNumber(bucket && bucket.count, 0))),
        }))
        .filter((bucket) => bucket.count > 0)
      : [];

    return {
      frames,
      warmupFrames: Math.max(0, Math.round(toFiniteNumber(benchmark.warmupFrames, 0))),
      resolution: Math.max(0, Math.round(toFiniteNumber(benchmark.resolution, 0))),
      avgStepMs,
      medianStepMs: toFiniteNumber(benchmark.medianStepMs, avgStepMs),
      p95StepMs: toFiniteNumber(benchmark.p95StepMs, benchmark.worstStepMs || avgStepMs),
      worstStepMs: toFiniteNumber(benchmark.worstStepMs, avgStepMs),
      stdDevStepMs: toFiniteNumber(benchmark.stdDevStepMs, 0),
      stabilityScore: Math.max(0, Math.min(100, toFiniteNumber(benchmark.stabilityScore, 100))),
      totalStepMs: toFiniteNumber(benchmark.totalStepMs, 0),
      histogram,
      diagnostics: benchmark.diagnostics || null,
    };
  }

  function normalizeTelemetry(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return {
      samples: Math.max(0, Math.round(toFiniteNumber(value.samples, 0))),
      warmupRemaining: Math.max(0, Math.round(toFiniteNumber(value.warmupRemaining, 0))),
      minSamples: Math.max(1, Math.round(toFiniteNumber(value.minSamples, 24))),
      stable: Boolean(value.stable),
      avgStepMs: toFiniteNumber(value.avgStepMs, 0),
      p95StepMs: toFiniteNumber(value.p95StepMs, 0),
      worstStepMs: toFiniteNumber(value.worstStepMs, 0),
      avgFps: toFiniteNumber(value.avgFps, 0),
      minFps: toFiniteNumber(value.minFps, 0),
      memoryMiB: toFiniteNumber(value.memoryMiB, 0),
      budgetMs: toFiniteNumber(value.budgetMs, 0),
      budgetLabel: String(value.budgetLabel || 'Collecting'),
    };
  }

  function normalizePerformanceAdvice(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return {
      severity: String(value.severity || 'collecting'),
      title: String(value.title || 'Collect samples'),
      action: String(value.action || 'Run the scene or benchmark before tuning'),
      reason: String(value.reason || ''),
      source: String(value.source || 'none'),
      budgetMs: toFiniteNumber(value.budgetMs, 0),
      measuredP95Ms: toFiniteNumber(value.measuredP95Ms, value.p95StepMs || 0),
      p95StepMs: toFiniteNumber(value.p95StepMs, 0),
    };
  }

  function normalizeReplayTrace(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const events = Array.isArray(value.events)
      ? value.events
        .map((event) => {
          const safeEvent = toSafeObject(event);
          return {
            timeMs: Math.max(0, Math.round(toFiniteNumber(safeEvent.timeMs, 0))),
            x: clampNumber(safeEvent.x, 0, 1, 0.5),
            y: clampNumber(safeEvent.y, 0, 1, 0.5),
            dx: clampNumber(safeEvent.dx, -1, 1, 0),
            dy: clampNumber(safeEvent.dy, -1, 1, 0),
            pressure: clampNumber(safeEvent.pressure, 0, 2, 0.75),
            color: Array.isArray(safeEvent.color)
              ? safeEvent.color.slice(0, 3).map((channel, index) => clampNumber(channel, 0, 1, index === 1 ? 1 : 0.5))
              : [0.5, 1, 0.8],
          };
        })
        .sort((a, b) => a.timeMs - b.timeMs)
      : [];

    if (events.length === 0) {
      return null;
    }

    return {
      version: Math.max(1, Math.round(toFiniteNumber(value.version, 1))),
      durationMs: Math.max(events[events.length - 1].timeMs, Math.round(toFiniteNumber(value.durationMs, events[events.length - 1].timeMs))),
      events,
    };
  }

  function fingerprintNumber(value, scale) {
    return Math.round(toFiniteNumber(value, 0) * scale);
  }

  function createReplayFingerprint(value) {
    const trace = normalizeReplayTrace(value);

    if (!trace) {
      return '';
    }

    const parts = [
      trace.version,
      trace.durationMs,
      trace.events.length,
    ];

    trace.events.forEach((event) => {
      parts.push(
        event.timeMs,
        fingerprintNumber(event.x, 10000),
        fingerprintNumber(event.y, 10000),
        fingerprintNumber(event.dx, 100000),
        fingerprintNumber(event.dy, 100000),
        fingerprintNumber(event.pressure, 1000),
        fingerprintNumber(event.color[0], 1000),
        fingerprintNumber(event.color[1], 1000),
        fingerprintNumber(event.color[2], 1000),
      );
    });

    let hash = 2166136261;
    const source = parts.join('|');

    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `trc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function analyzeReplayTrace(value) {
    const trace = normalizeReplayTrace(value);

    if (!trace) {
      return null;
    }

    let intervalTotal = 0;
    let pressureTotal = 0;
    let peakPressure = 0;
    let totalTravel = 0;
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    trace.events.forEach((event, index) => {
      if (index > 0) {
        intervalTotal += event.timeMs - trace.events[index - 1].timeMs;
      }

      pressureTotal += event.pressure;
      peakPressure = Math.max(peakPressure, event.pressure);
      totalTravel += Math.hypot(event.dx, event.dy);
      minX = Math.min(minX, event.x);
      maxX = Math.max(maxX, event.x);
      minY = Math.min(minY, event.y);
      maxY = Math.max(maxY, event.y);
    });

    return {
      events: trace.events.length,
      durationMs: trace.durationMs,
      avgIntervalMs: trace.events.length > 1 ? intervalTotal / (trace.events.length - 1) : 0,
      peakPressure,
      avgPressure: pressureTotal / trace.events.length,
      totalTravel,
      fingerprint: createReplayFingerprint(trace),
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
      },
    };
  }

  function getProvidedReplayFingerprint(value) {
    const safeValue = toSafeObject(value);
    const safeAnalysis = toSafeObject(safeValue.replayAnalysis);
    return String(safeAnalysis.fingerprint || safeValue.replayFingerprint || '');
  }

  function validateReplayPayload(value) {
    const safeValue = toSafeObject(value);
    const trace = normalizeReplayTrace(safeValue.replayTrace || safeValue.trace);

    if (!trace) {
      return {
        status: 'missing',
        label: 'Not recorded',
        verified: false,
        computedFingerprint: '',
        providedFingerprint: '',
      };
    }

    const computedFingerprint = createReplayFingerprint(trace);
    const providedFingerprint = getProvidedReplayFingerprint(safeValue);

    if (!providedFingerprint) {
      return {
        status: 'generated',
        label: 'Generated from trace',
        verified: true,
        computedFingerprint,
        providedFingerprint: '',
      };
    }

    const verified = providedFingerprint === computedFingerprint;

    return {
      status: verified ? 'verified' : 'mismatch',
      label: verified ? 'Verified' : 'Fingerprint mismatch',
      verified,
      computedFingerprint,
      providedFingerprint,
    };
  }

  function createShareParams(settings) {
    const safeSettings = toSafeObject(settings);
    const entries = {
      v: SHARE_VERSION,
      profile: safeSettings.profile || 'custom',
      preset: safeSettings.preset || 'neon',
      view: safeSettings.displayMode || 'dye',
      scenario: safeSettings.scenario || 'twin-vortex',
      grid: Math.round(toFiniteNumber(safeSettings.resolution, 80)),
      force: Math.round(toFiniteNumber(safeSettings.force, 1150)),
      radius: compactNumber(toFiniteNumber(safeSettings.radius, 0.06) * 100, 6, 1),
      dye: compactNumber(toFiniteNumber(safeSettings.dissipation, 0.985) * 100, 98.5, 1),
      velocity: compactNumber(toFiniteNumber(safeSettings.velocityDecay, 0.995) * 100, 99.5, 1),
      pressure: Math.round(toFiniteNumber(safeSettings.pressureIterations, 14)),
      swirl: Math.round(toFiniteNumber(safeSettings.vorticity, 22)),
      sources: Math.round(toFiniteNumber(safeSettings.sourceStrength, 0.42) * 100),
      vectors: safeSettings.vectorOverlay ? 1 : 0,
      brush: safeSettings.brushOverlay !== false ? 1 : 0,
      obstacle: safeSettings.obstacle !== false ? 1 : 0,
      glow: safeSettings.glow !== false ? 1 : 0,
      trace: safeSettings.traceOverlay !== false ? 1 : 0,
      run: safeSettings.runScenario ? 1 : 0,
    };

    return Object.entries(entries)
      .map(([key, value]) => encodePair(key, value))
      .join('&');
  }

  function settingsFromShareParams(value) {
    const params = decodeShareParams(value);

    if (params.v !== SHARE_VERSION) {
      return null;
    }

    return {
      profile: params.profile,
      preset: params.preset,
      displayMode: params.view,
      scenario: params.scenario,
      resolution: params.grid,
      force: Number(params.force),
      radius: Number(params.radius) / 100,
      dissipation: Number(params.dye) / 100,
      velocityDecay: Number(params.velocity) / 100,
      pressureIterations: Number(params.pressure),
      vorticity: Number(params.swirl),
      sourceStrength: Number(params.sources) / 100,
      vectorOverlay: params.vectors === '1',
      brushOverlay: params.brush !== '0',
      obstacle: params.obstacle !== '0',
      glow: params.glow !== '0',
      traceOverlay: params.trace !== '0',
      runScenario: params.run === '1',
    };
  }

  function createShareUrl(settings, href) {
    const baseUrl = String(href || '').split('#')[0];
    return `${baseUrl}#${createShareParams(settings)}`;
  }

  function createExportPayload(payload) {
    const safePayload = toSafeObject(payload);
    const settings = safePayload.settings || {};
    const replayTrace = normalizeReplayTrace(safePayload.replayTrace);
    const replayAnalysis = analyzeReplayTrace(replayTrace);

    return {
      project: PROJECT_NAME,
      exportedAt: safePayload.exportedAt || new Date().toISOString(),
      settings,
      share: createShareParams(settings),
      diagnostics: safePayload.diagnostics || null,
      telemetry: normalizeTelemetry(safePayload.telemetry),
      performanceAdvice: normalizePerformanceAdvice(safePayload.performanceAdvice),
      benchmark: normalizeBenchmark(safePayload.benchmark),
      replayTrace,
      replayAnalysis,
      replayIntegrity: validateReplayPayload({ replayTrace, replayAnalysis }),
      frames: Math.max(0, Math.round(toFiniteNumber(safePayload.frames, 0))),
    };
  }

  function formatNumber(value, fractionDigits) {
    return toFiniteNumber(value, 0).toFixed(fractionDigits);
  }

  function buildTechnicalReport(payload) {
    const safePayload = toSafeObject(payload);
    const settings = toSafeObject(safePayload.settings);
    const diagnostics = {
      ...DEFAULT_DIAGNOSTICS,
      ...toSafeObject(safePayload.diagnostics),
    };
    const benchmark = normalizeBenchmark(safePayload.benchmark);
    const telemetry = normalizeTelemetry(safePayload.telemetry);
    const performanceAdvice = normalizePerformanceAdvice(safePayload.performanceAdvice);
    const replayTrace = normalizeReplayTrace(safePayload.replayTrace);
    const replayAnalysis = analyzeReplayTrace(replayTrace);
    const replayIntegrity = safePayload.replayAnalysis || safePayload.replayIntegrity
      ? validateReplayPayload(safePayload)
      : validateReplayPayload({ replayTrace, replayAnalysis });
    const hasTelemetry = telemetry && telemetry.samples > 0;
    const displayLabels = toSafeObject(safePayload.displayLabels);
    const scenarioLabels = toSafeObject(safePayload.scenarioLabels);
    const shareUrl = String(safePayload.shareUrl || '');
    const benchmarkSummary = benchmark
      ? `${formatNumber(benchmark.avgStepMs, 1)} ms avg / ${formatNumber(benchmark.p95StepMs, 1)} ms p95 / ${formatNumber(benchmark.worstStepMs, 1)} ms worst over ${benchmark.frames} frames after ${benchmark.warmupFrames} warmup`
      : 'Not run';
    const benchmarkDistribution = benchmark && benchmark.histogram.length > 0
      ? benchmark.histogram.map((bucket) => `${bucket.label}: ${bucket.count}`).join(', ')
      : 'Not run';
    const replaySummary = replayAnalysis
      ? `${replayAnalysis.events} input events over ${formatNumber(replayAnalysis.durationMs / 1000, 1)} s, peak ${formatNumber(replayAnalysis.peakPressure, 2)}, travel ${formatNumber(replayAnalysis.totalTravel, 3)}`
      : 'Not recorded';
    const replayBounds = replayAnalysis && replayAnalysis.bounds
      ? `${formatNumber(replayAnalysis.bounds.minX * 100, 0)}-${formatNumber(replayAnalysis.bounds.maxX * 100, 0)} x / ${formatNumber(replayAnalysis.bounds.minY * 100, 0)}-${formatNumber(replayAnalysis.bounds.maxY * 100, 0)} y`
      : 'Not recorded';
    const replayFingerprint = replayAnalysis && replayAnalysis.fingerprint
      ? replayAnalysis.fingerprint
      : 'Not recorded';
    const replayIntegrityLabel = replayIntegrity && replayIntegrity.status !== 'missing'
      ? `${replayIntegrity.label}${replayIntegrity.computedFingerprint ? ` (${replayIntegrity.computedFingerprint})` : ''}`
      : 'Not recorded';

    return [
      `# ${PROJECT_NAME}`,
      '',
      `Profile: ${settings.profile || 'custom'}`,
      `Preset: ${settings.preset || 'unknown'}`,
      `View: ${displayLabels[settings.displayMode] || settings.displayMode || 'unknown'}`,
      `Scenario: ${scenarioLabels[settings.scenario] || settings.scenario || 'Manual Input'}`,
      `Grid: ${settings.resolution || 0} x ${settings.resolution || 0}`,
      `Pressure passes: ${settings.pressureIterations || 0}`,
      `Vorticity: ${settings.vorticity || 0}`,
      `Obstacle: ${settings.obstacle ? 'on' : 'off'}`,
      `Worker FPS: ${Math.max(0, Math.round(toFiniteNumber(safePayload.latestFps, 0)))}`,
      `Last solver step: ${formatNumber(diagnostics.stepMs, 1)} ms`,
      `Max density: ${formatNumber(diagnostics.maxDensity, 2)}`,
      `Max speed: ${formatNumber(diagnostics.maxSpeed, 3)}`,
      `Average divergence: ${formatNumber(diagnostics.avgDivergence, 4)}`,
      `Telemetry P95: ${hasTelemetry ? `${formatNumber(telemetry.p95StepMs, 1)} ms over ${telemetry.samples} samples` : 'Not collected'}`,
      `Estimated field memory: ${telemetry ? `${formatNumber(telemetry.memoryMiB, 2)} MiB` : 'Not collected'}`,
      `Performance budget: ${hasTelemetry ? `${telemetry.budgetLabel} (${formatNumber(telemetry.p95StepMs, 1)} / ${formatNumber(telemetry.budgetMs, 0)} ms)` : 'Not collected'}`,
      `Benchmark: ${benchmarkSummary}`,
      `Benchmark stability: ${benchmark ? `${formatNumber(benchmark.stabilityScore, 0)} / 100 with ${formatNumber(benchmark.stdDevStepMs, 2)} ms std dev` : 'Not run'}`,
      `Benchmark distribution: ${benchmarkDistribution}`,
      `Performance advice: ${performanceAdvice ? `${performanceAdvice.title} - ${performanceAdvice.action}${performanceAdvice.reason ? `. ${performanceAdvice.reason}` : ''}` : 'Not collected'}`,
      `Replay trace: ${replaySummary}`,
      `Replay bounds: ${replayBounds}`,
      `Replay fingerprint: ${replayFingerprint}`,
      `Replay integrity: ${replayIntegrityLabel}`,
      `Share link: ${shareUrl || 'Not generated'}`,
      '',
      'Technical stack: Canvas 2D, Web Worker, Float32Array fields, pressure projection, semi-Lagrangian advection, vorticity confinement, diagnostic render passes.',
    ].join('\n');
  }

  window.FluidConfigTools = Object.freeze({
    controlsFromSettings,
    analyzeReplayTrace,
    createReplayFingerprint,
    validateReplayPayload,
    normalizePerformanceAdvice,
    normalizeReplayTrace,
    normalizeTelemetry,
    normalizeBenchmark,
    createExportPayload,
    createShareParams,
    createShareUrl,
    settingsFromShareParams,
    buildTechnicalReport,
  });
}());
