const canvas = document.getElementById('fluidCanvas');
const context = canvas.getContext('2d', { alpha: false });
const profileSelect = document.getElementById('profileSelect');
const presetSelect = document.getElementById('presetSelect');
const displaySelect = document.getElementById('displaySelect');
const resolutionSelect = document.getElementById('resolutionSelect');
const scenarioSelect = document.getElementById('scenarioSelect');
const forceRange = document.getElementById('forceRange');
const radiusRange = document.getElementById('radiusRange');
const dissipationRange = document.getElementById('dissipationRange');
const velocityDecayRange = document.getElementById('velocityDecayRange');
const pressureRange = document.getElementById('pressureRange');
const swirlRange = document.getElementById('swirlRange');
const sourceRange = document.getElementById('sourceRange');
const forceValue = document.getElementById('forceValue');
const radiusValue = document.getElementById('radiusValue');
const dissipationValue = document.getElementById('dissipationValue');
const velocityDecayValue = document.getElementById('velocityDecayValue');
const pressureValue = document.getElementById('pressureValue');
const swirlValue = document.getElementById('swirlValue');
const sourceValue = document.getElementById('sourceValue');
const vectorToggle = document.getElementById('vectorToggle');
const brushToggle = document.getElementById('brushToggle');
const obstacleToggle = document.getElementById('obstacleToggle');
const glowToggle = document.getElementById('glowToggle');
const traceToggle = document.getElementById('traceToggle');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const defaultButton = document.getElementById('defaultButton');
const benchmarkButton = document.getElementById('benchmarkButton');
const tuneButton = document.getElementById('tuneButton');
const randomButton = document.getElementById('randomButton');
const scenarioButton = document.getElementById('scenarioButton');
const recordButton = document.getElementById('recordButton');
const replayButton = document.getElementById('replayButton');
const clearTraceButton = document.getElementById('clearTraceButton');
const exportImageButton = document.getElementById('exportImageButton');
const exportConfigButton = document.getElementById('exportConfigButton');
const importConfigButton = document.getElementById('importConfigButton');
const copyLinkButton = document.getElementById('copyLinkButton');
const copyReportButton = document.getElementById('copyReportButton');
const configFileInput = document.getElementById('configFileInput');
const fpsValue = document.getElementById('fpsValue');
const cellsValue = document.getElementById('cellsValue');
const samplesValue = document.getElementById('samplesValue');
const stepValue = document.getElementById('stepValue');
const p95Value = document.getElementById('p95Value');
const memoryValue = document.getElementById('memoryValue');
const densityValue = document.getElementById('densityValue');
const divergenceValue = document.getElementById('divergenceValue');
const benchmarkValue = document.getElementById('benchmarkValue');
const adviceValue = document.getElementById('adviceValue');
const traceValue = document.getElementById('traceValue');
const traceEventsValue = document.getElementById('traceEventsValue');
const traceDurationValue = document.getElementById('traceDurationValue');
const traceGapValue = document.getElementById('traceGapValue');
const tracePressureValue = document.getElementById('tracePressureValue');
const traceTravelValue = document.getElementById('traceTravelValue');
const traceBoundsValue = document.getElementById('traceBoundsValue');
const traceHashValue = document.getElementById('traceHashValue');
const traceIntegrityValue = document.getElementById('traceIntegrityValue');
const statusValue = document.getElementById('statusValue');
const modeBadge = document.getElementById('modeBadge');
const solverBadge = document.getElementById('solverBadge');
const scenarioBadge = document.getElementById('scenarioBadge');
const budgetBadge = document.getElementById('budgetBadge');
const configTools = window.FluidConfigTools;
const scenarioTools = window.FluidScenarioTools;
const telemetryTools = window.FluidTelemetryTools;
const replayTools = window.FluidReplayTools;
const presenterTools = window.FluidPresenterTools;
const browserTools = window.FluidBrowserTools;

if (!configTools || !scenarioTools || !telemetryTools || !replayTools || !presenterTools || !browserTools) {
  throw new Error('Fluid project helper scripts failed to load');
}

const PRESETS = {
  neon: {
    background: '#070806',
    palette: ['#7cffc4', '#f2c94c', '#ff5f7e', '#74d8ff'],
  },
  smoke: {
    background: '#0d1110',
    palette: ['#d7f2ff', '#9db7c7', '#6d8593', '#f2c94c'],
  },
  lava: {
    background: '#140906',
    palette: ['#ffdf70', '#ff8a3d', '#ff3d3d', '#2b1710'],
  },
  ocean: {
    background: '#061013',
    palette: ['#9ef9ff', '#49b7d8', '#2fd18b', '#f2e59b'],
  },
  aurora: {
    background: '#080b13',
    palette: ['#b7ff7a', '#65ffe4', '#9c7cff', '#f4d35e'],
  },
};

const DISPLAY_LABELS = {
  dye: 'Dye Field',
  velocity: 'Velocity Field',
  pressure: 'Pressure Map',
  curl: 'Curl Map',
};
const SCENARIO_LABELS = Object.fromEntries(
  scenarioTools.getScenarioOptions().map((scenario) => [scenario.id, scenario.label]),
);

const STORAGE_KEY = 'javascript-100-fluid-simulation-settings';
const DEFAULT_CONTROL_VALUES = {
  profileSelect: 'balanced',
  presetSelect: 'neon',
  displaySelect: 'dye',
  resolutionSelect: '80',
  scenarioSelect: scenarioTools.defaultScenario,
  forceRange: '1150',
  radiusRange: '6',
  dissipationRange: '98.5',
  velocityDecayRange: '99.5',
  pressureRange: '14',
  swirlRange: '22',
  sourceRange: '42',
  vectorToggle: false,
  brushToggle: true,
  obstacleToggle: true,
  glowToggle: true,
  traceToggle: true,
};
const PROFILE_VALUES = {
  performance: {
    resolutionSelect: '80',
    pressureRange: '10',
    swirlRange: '14',
    sourceRange: '34',
    vectorToggle: false,
    displaySelect: 'dye',
  },
  balanced: {
    resolutionSelect: '80',
    pressureRange: '14',
    swirlRange: '22',
    sourceRange: '42',
    vectorToggle: false,
    displaySelect: 'dye',
  },
  quality: {
    resolutionSelect: '128',
    pressureRange: '22',
    swirlRange: '30',
    sourceRange: '45',
    vectorToggle: false,
    displaySelect: 'dye',
  },
  diagnostic: {
    resolutionSelect: '96',
    pressureRange: '18',
    swirlRange: '22',
    sourceRange: '35',
    vectorToggle: true,
    displaySelect: 'velocity',
  },
};

const renderCanvas = document.createElement('canvas');
const renderContext = renderCanvas.getContext('2d', { alpha: false });
const presenter = presenterTools.createCanvasPresenter({
  canvas,
  context,
  renderCanvas,
  renderContext,
  replayTools,
});
const telemetryState = telemetryTools.createTelemetryState(120);
const traceState = replayTools.createTraceState(240);
const pointerState = new Map();
let worker = null;
let pendingFrame = false;
let benchmarkRunning = false;
let paused = false;
let frameCount = 0;
let latestFps = 0;
let lastFrameTime = performance.now();
let lastWorkerFrameTime = 0;
let queuedSplats = [];
let latestSettings = null;
let lastImageData = null;
let lastVectorSamples = null;
let lastDiagnostics = null;
let lastBenchmark = null;
let lastTelemetry = null;
let lastCursorPoint = null;
let activeScenario = null;
let replayState = null;
let lastReplayTrace = null;
let lastReplayIntegrity = null;

function readSettings() {
  const preset = PRESETS[presetSelect.value] || PRESETS.neon;

  return {
    preset: presetSelect.value,
    profile: profileSelect.value,
    background: preset.background,
    palette: preset.palette.map(presenterTools.hexToRgb),
    displayMode: displaySelect.value,
    scenario: scenarioSelect.value,
    resolution: Number(resolutionSelect.value),
    force: Number(forceRange.value),
    radius: Number(radiusRange.value) / 100,
    dissipation: Number(dissipationRange.value) / 100,
    velocityDecay: Number(velocityDecayRange.value) / 100,
    pressureIterations: Number(pressureRange.value),
    vorticity: Number(swirlRange.value),
    sourceStrength: Number(sourceRange.value) / 100,
    vectorOverlay: vectorToggle.checked,
    brushOverlay: brushToggle.checked,
    obstacle: obstacleToggle.checked,
    glow: glowToggle.checked,
    traceOverlay: traceToggle.checked,
  };
}

function updateControlLabels() {
  forceValue.textContent = forceRange.value;
  radiusValue.textContent = `${Number(radiusRange.value).toFixed(1)}%`;
  dissipationValue.textContent = `${Number(dissipationRange.value).toFixed(1)}%`;
  velocityDecayValue.textContent = `${Number(velocityDecayRange.value).toFixed(1)}%`;
  pressureValue.textContent = pressureRange.value;
  swirlValue.textContent = swirlRange.value;
  sourceValue.textContent = `${sourceRange.value}%`;
  cellsValue.textContent = `${resolutionSelect.value} x ${resolutionSelect.value}`;
  modeBadge.textContent = DISPLAY_LABELS[displaySelect.value] || 'Dye Field';
  solverBadge.textContent = `Projection ${pressureRange.value}`;
  updateTelemetryLabels(lastTelemetry || telemetryTools.summarizeTelemetry(telemetryState, readSettings()));
}

function getControlMap() {
  return {
    profileSelect,
    presetSelect,
    displaySelect,
    resolutionSelect,
    scenarioSelect,
    forceRange,
    radiusRange,
    dissipationRange,
    velocityDecayRange,
    pressureRange,
    swirlRange,
    sourceRange,
    vectorToggle,
    brushToggle,
    obstacleToggle,
    glowToggle,
    traceToggle,
  };
}

function getConfigOptions() {
  return {
    profiles: Array.from(profileSelect.options).map((option) => option.value),
    presets: Array.from(presetSelect.options).map((option) => option.value),
    displayModes: Array.from(displaySelect.options).map((option) => option.value),
    resolutions: Array.from(resolutionSelect.options).map((option) => option.value),
    scenarios: Array.from(scenarioSelect.options).map((option) => option.value),
  };
}

function applyControlValues(values) {
  const controls = getControlMap();

  Object.entries(controls).forEach(([key, control]) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      return;
    }

    if (control.type === 'checkbox') {
      control.checked = Boolean(values[key]);
    } else {
      control.value = values[key];
    }
  });
}

function applySettings(settings, status) {
  const controlValues = configTools.controlsFromSettings(
    settings,
    DEFAULT_CONTROL_VALUES,
    getConfigOptions(),
  );

  applyControlValues(controlValues);
  updateControlLabels();
  persistControls();
  latestSettings = readSettings();
  clearBenchmark();

  if (status) {
    setStatus(status);
  }

  return Boolean(settings && settings.runScenario);
}

function applyShareStateFromLocation() {
  const settings = configTools.settingsFromShareParams(window.location.hash);

  if (!settings) {
    return false;
  }

  return applySettings(settings, 'Shared link loaded');
}

function restoreControls() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    applyControlValues(saved);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistControls() {
  const settings = Object.fromEntries(
    Object.entries(getControlMap()).map(([key, control]) => [
      key,
      control.type === 'checkbox' ? control.checked : control.value,
    ]),
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function clearBenchmark() {
  if (!lastBenchmark) {
    return;
  }

  lastBenchmark = null;
  benchmarkValue.textContent = 'Not run';
}

function getExportReplayTrace() {
  const currentTrace = traceState.active ? traceState : lastReplayTrace;
  const normalizedTrace = replayTools.normalizeTrace(currentTrace);

  return normalizedTrace && normalizedTrace.events.length > 0 ? normalizedTrace : null;
}

function formatTraceBounds(bounds) {
  if (!bounds) {
    return '--';
  }

  const xRange = `${Math.round(bounds.minX * 100)}-${Math.round(bounds.maxX * 100)}`;
  const yRange = `${Math.round(bounds.minY * 100)}-${Math.round(bounds.maxY * 100)}`;

  return `${xRange} / ${yRange}`;
}

function updateTraceInspector(trace) {
  const analysis = replayTools.analyzeTrace(trace);
  const integrity = trace && lastReplayIntegrity
    ? lastReplayIntegrity
    : configTools.validateReplayPayload({ replayTrace: trace, replayAnalysis: configTools.analyzeReplayTrace(trace) });

  traceEventsValue.textContent = String(analysis.events);
  traceDurationValue.textContent = `${(analysis.durationMs / 1000).toFixed(1)} s`;
  traceGapValue.textContent = `${Math.round(analysis.avgIntervalMs)} ms`;
  tracePressureValue.textContent = analysis.peakPressure.toFixed(2);
  traceTravelValue.textContent = analysis.totalTravel.toFixed(3);
  traceBoundsValue.textContent = formatTraceBounds(analysis.bounds);
  traceHashValue.textContent = analysis.fingerprint || '--';
  traceIntegrityValue.textContent = integrity && integrity.status !== 'missing' ? integrity.label : '--';
  traceIntegrityValue.dataset.state = integrity ? integrity.status : 'missing';
}

function updateTraceLabels(progress) {
  const recordingSummary = replayTools.summarizeTrace(traceState);

  if (traceState.active) {
    updateTraceInspector(traceState);
    traceValue.textContent = `Rec ${recordingSummary.events}/${recordingSummary.maxEvents}`;
    traceValue.dataset.state = 'recording';
    recordButton.textContent = 'Stop Recording';
    replayButton.disabled = true;
    clearTraceButton.disabled = true;
    return;
  }

  if (replayState && replayState.active) {
    updateTraceInspector(replayState.trace);
    traceValue.textContent = `Play ${Math.round((progress || 0) * 100)}%`;
    traceValue.dataset.state = 'playing';
    recordButton.disabled = true;
    replayButton.disabled = false;
    replayButton.textContent = 'Stop Replay';
    clearTraceButton.disabled = true;
    return;
  }

  const trace = replayTools.normalizeTrace(lastReplayTrace);
  const eventCount = trace ? trace.events.length : 0;
  updateTraceInspector(trace);
  traceValue.textContent = eventCount > 0 ? `${eventCount} events` : 'No trace';
  traceValue.dataset.state = eventCount > 0 ? 'ready' : 'idle';
  recordButton.disabled = false;
  recordButton.textContent = 'Record Trace';
  replayButton.disabled = eventCount === 0;
  replayButton.textContent = 'Play Trace';
  clearTraceButton.disabled = eventCount === 0;
}

function stopReplay(status) {
  if (replayState) {
    replayState.active = false;
    replayState = null;
  }

  updateTraceLabels();

  if (status) {
    setStatus(status);
  }
}

function stopRecording(status) {
  if (!traceState.active) {
    updateTraceLabels();
    return;
  }

  lastReplayTrace = replayTools.finishRecording(traceState, performance.now());
  lastReplayIntegrity = null;
  updateTraceLabels();

  if (status) {
    setStatus(status);
  }
}

function startRecording() {
  stopScenario();
  stopReplay();
  replayTools.beginRecording(traceState, performance.now());
  lastReplayTrace = null;
  lastReplayIntegrity = null;
  updateTraceLabels();
  setStatus('Trace recording');
}

function startReplay() {
  const trace = replayTools.normalizeTrace(lastReplayTrace);

  if (!trace || trace.events.length === 0) {
    setStatus('No trace recorded');
    updateTraceLabels();
    return;
  }

  stopScenario();
  stopRecording();

  if (paused) {
    paused = false;
    pauseButton.textContent = 'Pause';
  }

  replayState = replayTools.createReplayState(trace, performance.now());
  resetSimulation(false);
  updateTraceLabels(0);
  setStatus(`Trace replay: ${trace.events.length} events`);
}

function clearTrace() {
  stopReplay();
  replayTools.clearRecording(traceState);
  lastReplayTrace = null;
  lastReplayIntegrity = null;
  updateTraceLabels();
  setStatus('Trace cleared');
}

function applyProfile(profileName) {
  stopScenario();
  stopReplay();
  stopRecording('Trace saved');
  const profileValues = PROFILE_VALUES[profileName];

  if (!profileValues) {
    persistControls();
    latestSettings = readSettings();
    drawFrame();
    return;
  }

  applyControlValues({
    profileSelect: profileName,
    ...profileValues,
  });
  updateControlLabels();
  persistControls();
  latestSettings = readSettings();
  clearBenchmark();
  resetSimulation(true);
}

function resizeCanvas() {
  if (presenter.resize(window.devicePixelRatio || 1)) {
    drawFrame();
  }
}

function setStatus(value) {
  statusValue.textContent = value;
}

function getRuntimeStatus() {
  if (paused) {
    return 'Paused';
  }

  if (traceState.active) {
    return 'Recording trace';
  }

  if (replayState && replayState.active) {
    return 'Trace replay';
  }

  if (activeScenario) {
    return 'Scenario';
  }

  return 'Running';
}

function updateScenarioBadge(nowSeconds = performance.now() / 1000) {
  if (!activeScenario) {
    scenarioBadge.textContent = 'Manual Input';
    return;
  }

  const elapsed = Math.max(0, nowSeconds - activeScenario.startTime);
  const progress = Math.min(99, Math.round((elapsed / activeScenario.duration) * 100));
  scenarioBadge.textContent = `${activeScenario.label} ${progress}%`;
}

function updateTelemetryLabels(summary) {
  const telemetry = telemetryTools.normalizeTelemetry(summary)
    || telemetryTools.summarizeTelemetry(telemetryState, readSettings());
  const warmingUp = telemetry.samples === 0 && telemetry.warmupRemaining > 0;
  const collecting = !warmingUp && !telemetry.stable;

  p95Value.textContent = warmingUp ? 'Warmup' : collecting ? 'Collecting' : `${telemetry.p95StepMs.toFixed(1)} ms`;
  memoryValue.textContent = `${telemetry.memoryMiB.toFixed(2)} MiB`;
  budgetBadge.textContent = warmingUp
    ? `Warmup ${telemetry.warmupRemaining}`
    : collecting
    ? `${telemetry.samples}/${telemetry.minSamples} samples`
    : telemetry.budgetState === 'idle'
    ? 'Budget --'
    : `${telemetry.budgetLabel} ${telemetry.p95StepMs.toFixed(1)}/${telemetry.budgetMs.toFixed(0)} ms`;
  budgetBadge.dataset.state = telemetry.budgetState;

  const advice = telemetryTools.buildPerformanceAdvice(readSettings(), telemetry, lastBenchmark);
  adviceValue.textContent = advice.title;
  adviceValue.dataset.state = advice.severity;
  adviceValue.title = advice.reason || advice.action;
}

function stopScenario(status) {
  if (!activeScenario) {
    updateScenarioBadge();
    return;
  }

  activeScenario = null;
  scenarioButton.textContent = 'Run Scenario';
  updateScenarioBadge();

  if (status) {
    setStatus(status);
  }
}

function startScenario() {
  const scenario = scenarioTools.getScenario(scenarioSelect.value);

  stopReplay();
  stopRecording('Trace saved');

  if (paused) {
    paused = false;
    pauseButton.textContent = 'Pause';
  }

  activeScenario = {
    id: scenario.id,
    label: scenario.label,
    duration: scenario.duration,
    startTime: performance.now() / 1000,
    pausedAt: null,
  };
  scenarioButton.textContent = 'Stop Scenario';
  resetSimulation(false);
  updateScenarioBadge();
  setStatus(`Scenario: ${scenario.label}`);
}

function collectScenarioSplats(nowSeconds, settings) {
  if (!activeScenario) {
    return [];
  }

  const elapsed = nowSeconds - activeScenario.startTime;

  if (elapsed > activeScenario.duration) {
    stopScenario('Scenario complete');
    return [];
  }

  updateScenarioBadge(nowSeconds);
  return scenarioTools.generateSplats(activeScenario.id, elapsed, settings);
}

function buildSplat(x, y, dx, dy, pressure) {
  const preset = PRESETS[presetSelect.value] || PRESETS.neon;
  return presenterTools.createSplat({
    x,
    y,
    dx,
    dy,
    pressure,
    palette: preset.palette,
  });
}

function pointerToCanvas(event) {
  return presenterTools.pointFromRect(event, canvas.getBoundingClientRect());
}

function addPointerSplat(event, pressureOverride) {
  const point = pointerToCanvas(event);
  const previous = pointerState.get(event.pointerId);
  const pressure = pressureOverride || event.pressure || 0.75;
  const dx = previous ? point.x - previous.x : 0;
  const dy = previous ? point.y - previous.y : 0;
  const splat = buildSplat(point.x, point.y, dx, dy, pressure);

  pointerState.set(event.pointerId, point);
  queuedSplats.push(splat);

  if (traceState.active) {
    const summary = replayTools.recordSplat(traceState, splat, performance.now());
    lastReplayTrace = replayTools.normalizeTrace(traceState);
    updateTraceLabels();

    if (!summary.active && summary.events >= summary.maxEvents) {
      setStatus('Trace limit reached');
    }
  }
}

function getTraceForOverlay() {
  if (traceState.active) {
    return traceState;
  }

  if (replayState && replayState.trace) {
    return replayState.trace;
  }

  return lastReplayTrace;
}

function drawFrame() {
  const settings = latestSettings || readSettings();
  const traceForOverlay = getTraceForOverlay();
  const traceProgressIndex = replayState && replayState.trace && traceForOverlay === replayState.trace
    ? replayState.index - 1
    : null;

  presenter.drawFrame({
    settings,
    imageData: lastImageData,
    vectorSamples: lastVectorSamples,
    cursorPoint: lastCursorPoint,
    trace: traceForOverlay,
    traceProgressIndex,
  });
}

function exportImage() {
  resizeCanvas();
  drawFrame();

  canvas.toBlob((blob) => {
    if (blob) {
      browserTools.downloadBlob('fluid-simulation-studio.png', blob);
    }
  }, 'image/png');
}

function exportConfig() {
  const settings = readSettings();
  const config = configTools.createExportPayload({
    settings,
    diagnostics: lastDiagnostics,
    telemetry: lastTelemetry,
    performanceAdvice: telemetryTools.buildPerformanceAdvice(settings, lastTelemetry, lastBenchmark),
    benchmark: lastBenchmark,
    replayTrace: getExportReplayTrace(),
    frames: frameCount,
  });
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], {
    type: 'application/json',
  });

  browserTools.downloadBlob('fluid-simulation-config.json', blob);
}

async function importConfigFile(file) {
  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    const importedSettings = parsed.settings || configTools.settingsFromShareParams(parsed.share) || parsed;
    const importedTrace = replayTools.normalizeTrace(parsed.replayTrace || parsed.trace);
    const importedIntegrity = configTools.validateReplayPayload(parsed);

    stopScenario();
    stopReplay();
    stopRecording();
    replayTools.clearRecording(traceState);
    lastReplayTrace = importedTrace && importedTrace.events.length > 0 ? importedTrace : null;
    lastReplayIntegrity = lastReplayTrace ? importedIntegrity : null;
    applySettings(importedSettings);
    lastBenchmark = configTools.normalizeBenchmark(parsed.benchmark);
    benchmarkValue.textContent = lastBenchmark ? `${lastBenchmark.p95StepMs.toFixed(1)} p95` : 'Not run';
    updateTelemetryLabels(lastTelemetry);
    updateTraceLabels();
    resetSimulation(true);
    setStatus(lastReplayTrace ? `Config imported: ${importedIntegrity.label}` : 'Config imported');
  } catch (error) {
    setStatus('Import failed');
  } finally {
    configFileInput.value = '';
  }
}

function buildTechnicalReport() {
  const settings = readSettings();

  return configTools.buildTechnicalReport({
    settings,
    diagnostics: lastDiagnostics,
    benchmark: lastBenchmark,
    telemetry: lastTelemetry,
    performanceAdvice: telemetryTools.buildPerformanceAdvice(settings, lastTelemetry, lastBenchmark),
    replayTrace: getExportReplayTrace(),
    latestFps,
    displayLabels: DISPLAY_LABELS,
    scenarioLabels: SCENARIO_LABELS,
    shareUrl: buildShareUrl(Boolean(activeScenario)),
  });
}

function buildShareUrl(runScenario) {
  return configTools.createShareUrl(
    {
      ...readSettings(),
      runScenario,
    },
    window.location.href,
  );
}

async function copyTechnicalReport() {
  const report = buildTechnicalReport();
  const copied = await browserTools.copyText(report);

  if (copied) {
    setStatus('Report copied');
    return;
  }

  browserTools.downloadBlob('fluid-simulation-report.md', new Blob([report], { type: 'text/markdown' }));
  setStatus('Report exported');
}

async function copyShareLink() {
  const shareUrl = buildShareUrl(Boolean(activeScenario));
  const copied = await browserTools.copyText(shareUrl);

  setStatus(copied ? 'Link copied' : 'Link copy failed');
}

function applyPerformanceTune() {
  const result = telemetryTools.createTunedControlValues(readSettings(), lastTelemetry, lastBenchmark);

  if (!result.changed) {
    setStatus(result.advice.title);
    return;
  }

  stopScenario();
  stopReplay();
  stopRecording('Trace saved');
  applyControlValues(result.controlValues);
  updateControlLabels();
  persistControls();
  latestSettings = readSettings();
  clearBenchmark();
  resetSimulation(true);
  setStatus(`Tuned: ${result.advice.title}`);
}

function resetSimulation(randomize) {
  latestSettings = readSettings();
  queuedSplats = [];
  pendingFrame = false;
  frameCount = 0;
  lastWorkerFrameTime = 0;
  lastDiagnostics = null;
  lastVectorSamples = null;
  telemetryTools.resetTelemetry(telemetryState);
  lastTelemetry = telemetryTools.summarizeTelemetry(telemetryState, latestSettings);
  samplesValue.textContent = '0';
  fpsValue.textContent = '0';
  stepValue.textContent = '0.0 ms';
  p95Value.textContent = '0.0 ms';
  memoryValue.textContent = `${telemetryTools.estimateSimulationMemoryMiB(latestSettings).toFixed(2)} MiB`;
  densityValue.textContent = '0.00';
  divergenceValue.textContent = '0.000';
  budgetBadge.textContent = 'Budget --';
  budgetBadge.dataset.state = 'idle';
  adviceValue.textContent = 'Collect samples';
  adviceValue.dataset.state = 'collecting';
  adviceValue.title = 'Run the scene or benchmark before tuning';
  updateTelemetryLabels(lastTelemetry);
  updateTraceLabels();

  if (worker) {
    worker.postMessage({
      type: randomize ? 'randomize' : 'reset',
      settings: latestSettings,
      time: performance.now() / 1000,
    });
    setStatus(randomize ? 'Randomizing' : 'Resetting');
  }
}

function sendFrame(now) {
  if (!worker || pendingFrame || benchmarkRunning || paused) {
    return;
  }

  latestSettings = readSettings();
  const nowSeconds = now / 1000;
  const splats = queuedSplats.splice(0, queuedSplats.length);
  splats.push(...collectScenarioSplats(nowSeconds, latestSettings));

  if (replayState && replayState.active) {
    const replayResult = replayTools.collectReplaySplats(replayState, now);
    splats.push(...replayResult.splats);
    updateTraceLabels(replayResult.progress);

    if (replayResult.completed) {
      stopReplay('Trace replay complete');
    }
  }

  pendingFrame = true;

  worker.postMessage({
    type: 'step',
    settings: latestSettings,
    splats,
    dt: Math.min(0.033, Math.max(0.008, (now - lastFrameTime) / 1000)),
    time: nowSeconds,
  });
}

function handleWorkerMessage(event) {
  const message = event.data;

  if (message.type === 'ready') {
    setStatus('Ready');
    resetSimulation(true);
    return;
  }

  if (message.type === 'benchmark') {
    benchmarkRunning = false;
    benchmarkButton.disabled = false;
    lastBenchmark = {
      frames: message.frames,
      warmupFrames: message.warmupFrames,
      resolution: message.resolution,
      avgStepMs: message.avgStepMs,
      medianStepMs: message.medianStepMs,
      p95StepMs: message.p95StepMs,
      worstStepMs: message.worstStepMs,
      stdDevStepMs: message.stdDevStepMs,
      stabilityScore: message.stabilityScore,
      totalStepMs: message.totalStepMs,
      histogram: message.histogram,
      diagnostics: message.diagnostics,
    };
    benchmarkValue.textContent = `${message.p95StepMs.toFixed(1)} p95`;
    updateTelemetryLabels(lastTelemetry);
    lastFrameTime = performance.now();
    lastWorkerFrameTime = 0;
    setStatus(getRuntimeStatus());
    return;
  }

  if (message.type !== 'frame') {
    return;
  }

  pendingFrame = false;
  frameCount += 1;
  const nowTime = performance.now();

  if (lastWorkerFrameTime > 0) {
    latestFps = Math.round(1000 / Math.max(1, nowTime - lastWorkerFrameTime));
    fpsValue.textContent = String(latestFps);
  }

  lastWorkerFrameTime = nowTime;
  samplesValue.textContent = String(frameCount);
  cellsValue.textContent = `${message.width} x ${message.height}`;
  lastImageData = new ImageData(new Uint8ClampedArray(message.pixels), message.width, message.height);
  lastDiagnostics = message.diagnostics || null;
  lastVectorSamples = message.vectorSamples
    ? {
      width: message.width,
      height: message.height,
      data: new Float32Array(message.vectorSamples),
    }
    : null;

  if (lastDiagnostics) {
    stepValue.textContent = `${lastDiagnostics.stepMs.toFixed(1)} ms`;
    densityValue.textContent = lastDiagnostics.maxDensity.toFixed(2);
    divergenceValue.textContent = lastDiagnostics.avgDivergence.toFixed(3);
    lastTelemetry = telemetryTools.recordFrame(
      telemetryState,
      lastDiagnostics,
      latestFps,
      latestSettings || readSettings(),
    );
    updateTelemetryLabels(lastTelemetry);
  }

  drawFrame();
  setStatus(getRuntimeStatus());
}

function tick(now) {
  resizeCanvas();

  sendFrame(now);
  lastFrameTime = now;
  requestAnimationFrame(tick);
}

function bootWorker() {
  try {
    worker = new Worker('fluid-worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = () => {
      setStatus('Worker error');
      pendingFrame = false;
    };
  } catch (error) {
    worker = null;
    setStatus('Worker blocked');
    drawFrame();
  }
}

function handleKeyboardShortcut(event) {
  const action = browserTools.getShortcutAction(event);

  if (!action) {
    return;
  }

  if (action === 'pause') {
    event.preventDefault();
    pauseButton.click();
  } else if (action === 'randomize') {
    randomButton.click();
  } else if (action === 'defaults') {
    defaultButton.click();
  } else if (action === 'benchmark') {
    benchmarkButton.click();
  } else if (action === 'scenario') {
    scenarioButton.click();
  }
}

[profileSelect, presetSelect, displaySelect, resolutionSelect, forceRange, radiusRange, dissipationRange, velocityDecayRange, pressureRange, swirlRange, sourceRange, vectorToggle, brushToggle, obstacleToggle, glowToggle]
  .forEach((control) => {
    control.addEventListener('input', () => {
      stopReplay();

      if (traceState.active) {
        stopRecording('Trace saved');
      }

      if (control === profileSelect) {
        applyProfile(profileSelect.value);
        return;
      }

      if (control === presetSelect || control === resolutionSelect) {
        stopScenario();
      }

      profileSelect.value = 'custom';
      updateControlLabels();
      latestSettings = readSettings();
      persistControls();
      clearBenchmark();
      updateTelemetryLabels(lastTelemetry);
      drawFrame();
    });
  });

traceToggle.addEventListener('input', () => {
  latestSettings = readSettings();
  persistControls();
  drawFrame();
});

scenarioSelect.addEventListener('change', () => {
  stopScenario();
  updateScenarioBadge();
  persistControls();
  latestSettings = readSettings();
});
scenarioButton.addEventListener('click', () => {
  if (activeScenario) {
    stopScenario('Scenario stopped');
    return;
  }

  startScenario();
});
presetSelect.addEventListener('change', () => resetSimulation(true));
resolutionSelect.addEventListener('change', () => resetSimulation(true));

canvas.addEventListener('pointerdown', (event) => {
  stopScenario('Manual input');
  stopReplay('Manual input');
  canvas.setPointerCapture(event.pointerId);
  addPointerSplat(event, 1);
  lastCursorPoint = pointerToCanvas(event);
});

canvas.addEventListener('pointermove', (event) => {
  lastCursorPoint = pointerToCanvas(event);

  if (!pointerState.has(event.pointerId)) {
    drawFrame();
    return;
  }

  addPointerSplat(event);
});

canvas.addEventListener('pointerup', (event) => {
  pointerState.delete(event.pointerId);
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', (event) => {
  pointerState.delete(event.pointerId);
});

canvas.addEventListener('pointerleave', () => {
  lastCursorPoint = null;
  drawFrame();
});

pauseButton.addEventListener('click', () => {
  const nowSeconds = performance.now() / 1000;
  paused = !paused;

  if (activeScenario) {
    if (paused) {
      activeScenario.pausedAt = nowSeconds;
    } else if (activeScenario.pausedAt !== null) {
      activeScenario.startTime += nowSeconds - activeScenario.pausedAt;
      activeScenario.pausedAt = null;
    }
  }

  if (replayState && replayState.active) {
    if (paused) {
      replayState.pausedAtMs = nowSeconds * 1000;
    } else if (replayState.pausedAtMs) {
      replayState.startedAtMs += nowSeconds * 1000 - replayState.pausedAtMs;
      replayState.pausedAtMs = 0;
    }
  }

  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  updateScenarioBadge(nowSeconds);
  setStatus(getRuntimeStatus());
});

resetButton.addEventListener('click', () => {
  stopScenario();
  stopReplay();
  stopRecording('Trace saved');
  resetSimulation(false);
});
defaultButton.addEventListener('click', () => {
  stopScenario();
  stopReplay();
  stopRecording('Trace saved');
  applyControlValues(DEFAULT_CONTROL_VALUES);
  updateControlLabels();
  persistControls();
  latestSettings = readSettings();
  clearBenchmark();
  resetSimulation(true);
});
benchmarkButton.addEventListener('click', () => {
  if (!worker || benchmarkRunning) {
    return;
  }

  benchmarkRunning = true;
  benchmarkButton.disabled = true;
  benchmarkValue.textContent = 'Running';
  setStatus('Benchmarking');
  worker.postMessage({
    type: 'benchmark',
    settings: {
      ...readSettings(),
      displayMode: 'dye',
      vectorOverlay: false,
    },
    frames: 36,
  });
});
tuneButton.addEventListener('click', applyPerformanceTune);
randomButton.addEventListener('click', () => {
  stopScenario();
  stopReplay();
  stopRecording('Trace saved');
  resetSimulation(true);
});
recordButton.addEventListener('click', () => {
  if (traceState.active) {
    stopRecording('Trace saved');
    return;
  }

  startRecording();
});
replayButton.addEventListener('click', () => {
  if (replayState && replayState.active) {
    stopReplay('Trace replay stopped');
    return;
  }

  startReplay();
});
clearTraceButton.addEventListener('click', clearTrace);
exportImageButton.addEventListener('click', exportImage);
exportConfigButton.addEventListener('click', exportConfig);
importConfigButton.addEventListener('click', () => configFileInput.click());
configFileInput.addEventListener('change', () => importConfigFile(configFileInput.files[0]));
copyLinkButton.addEventListener('click', copyShareLink);
copyReportButton.addEventListener('click', copyTechnicalReport);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', handleKeyboardShortcut);

restoreControls();
const shouldRunSharedScenario = applyShareStateFromLocation();
updateControlLabels();
updateScenarioBadge();
updateTraceLabels();
latestSettings = readSettings();
drawFrame();
bootWorker();
if (shouldRunSharedScenario) {
  startScenario();
}
requestAnimationFrame(tick);
