const canvas = document.getElementById('renderCanvas');
const context = canvas.getContext('2d', { alpha: false });
const {
  TILE_SIZE,
  DISPLAY_ASPECT_RATIO,
  ADAPTIVE_MIN_SAMPLES,
  ADAPTIVE_VARIANCE_THRESHOLD,
  QUALITY_PROFILES,
  buildRenderConfig,
  buildScene,
  clamp,
  createTiles,
  formatDuration,
  formatNumber,
  toByte,
} = window.RayStudioCore;
const { createCanvasPresenter } = window.RayCanvasPresenter;
const requestPaintFrame = (callback) => {
  const schedule = window.requestAnimationFrame || ((next) => setTimeout(next, 16));
  return schedule.call(window, callback);
};
const presenter = createCanvasPresenter({
  context,
  toByte,
  requestFrame: requestPaintFrame,
});

const elements = {
  viewportPanel: document.querySelector('.viewport-panel'),
  canvasFrame: document.querySelector('.canvas-frame'),
  status: document.getElementById('renderStatus'),
  overlay: document.getElementById('renderOverlay'),
  sampleBadge: document.getElementById('sampleBadge'),
  progressBar: document.getElementById('progressBar'),
  elapsedBadge: document.getElementById('elapsedBadge'),
  etaBadge: document.getElementById('etaBadge'),
  samplesMetric: document.getElementById('samplesMetric'),
  raysMetric: document.getElementById('raysMetric'),
  raysPerSecondMetric: document.getElementById('raysPerSecondMetric'),
  workersMetric: document.getElementById('workersMetric'),
  sceneLabel: document.getElementById('sceneLabel'),
  scenePreset: document.getElementById('scenePreset'),
  qualityLabel: document.getElementById('qualityLabel'),
  qualityProfile: document.getElementById('qualityProfile'),
  resolutionSelect: document.getElementById('resolutionSelect'),
  bouncesInput: document.getElementById('bouncesInput'),
  bouncesValue: document.getElementById('bouncesValue'),
  sampleTargetInput: document.getElementById('sampleTargetInput'),
  sampleTargetValue: document.getElementById('sampleTargetValue'),
  cameraYawInput: document.getElementById('cameraYawInput'),
  cameraYawValue: document.getElementById('cameraYawValue'),
  cameraHeightInput: document.getElementById('cameraHeightInput'),
  cameraHeightValue: document.getElementById('cameraHeightValue'),
  fovInput: document.getElementById('fovInput'),
  fovValue: document.getElementById('fovValue'),
  focusDistanceInput: document.getElementById('focusDistanceInput'),
  focusDistanceValue: document.getElementById('focusDistanceValue'),
  apertureInput: document.getElementById('apertureInput'),
  apertureValue: document.getElementById('apertureValue'),
  lightInput: document.getElementById('lightInput'),
  lightValue: document.getElementById('lightValue'),
  warmthInput: document.getElementById('warmthInput'),
  warmthValue: document.getElementById('warmthValue'),
  exposureInput: document.getElementById('exposureInput'),
  exposureValue: document.getElementById('exposureValue'),
  contrastInput: document.getElementById('contrastInput'),
  contrastValue: document.getElementById('contrastValue'),
  denoiseInput: document.getElementById('denoiseInput'),
  pauseButton: document.getElementById('pauseButton'),
  restartButton: document.getElementById('restartButton'),
  exportButton: document.getElementById('exportButton'),
  metadataButton: document.getElementById('metadataButton'),
};

const MAX_WORKERS = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));

const state = {
  jobId: 0,
  sample: 0,
  targetSamples: 128,
  activeTiles: 0,
  tileQueue: [],
  workers: [],
  idleWorkers: [],
  width: 640,
  height: 360,
  rays: 0,
  raysPerSecond: 0,
  frameStart: performance.now(),
  renderStart: performance.now(),
  rendering: false,
  paused: false,
  pauseRequested: false,
  tileStats: new Map(),
  currentConfig: null,
  currentScene: null,
};

function initialize() {
  createWorkers();
  bindControls();
  fitCanvasToViewport();
  applyQualityProfile(elements.qualityProfile.value, false);
  updateControlOutputs();
  startRender();
}

function createWorkers() {
  state.workers.forEach(worker => worker.terminate());
  state.workers = [];
  state.idleWorkers = [];

  for (let i = 0; i < MAX_WORKERS; i += 1) {
    const worker = new Worker('tracer-worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
    worker.workerIndex = i;
    state.workers.push(worker);
    state.idleWorkers.push(worker);
  }

  elements.workersMetric.textContent = String(state.workers.length);
}

function bindControls() {
  window.addEventListener('resize', scheduleCanvasFit);

  elements.qualityProfile.addEventListener('change', () => {
    applyQualityProfile(elements.qualityProfile.value, true);
  });

  [
    elements.scenePreset,
    elements.resolutionSelect,
    elements.bouncesInput,
    elements.sampleTargetInput,
    elements.cameraYawInput,
    elements.cameraHeightInput,
    elements.fovInput,
    elements.focusDistanceInput,
    elements.apertureInput,
    elements.lightInput,
    elements.warmthInput,
  ].forEach(control => {
    control.addEventListener('input', () => {
      updateControlOutputs();
      scheduleRestart();
    });
  });

  [
    elements.exposureInput,
    elements.contrastInput,
    elements.denoiseInput,
  ].forEach(control => {
    control.addEventListener('input', () => {
      updateControlOutputs();
      if (state.sample > 0) {
        presenter.drawAccumulation(getPresentationSettings());
      }
    });
  });

  elements.pauseButton.addEventListener('click', togglePause);
  elements.restartButton.addEventListener('click', startRender);
  elements.exportButton.addEventListener('click', exportPng);
  elements.metadataButton.addEventListener('click', exportMetadata);
}

let canvasFitFrame = 0;
function scheduleCanvasFit() {
  cancelAnimationFrame(canvasFitFrame);
  canvasFitFrame = requestAnimationFrame(fitCanvasToViewport);
}

function fitCanvasToViewport() {
  if (!elements.viewportPanel || !elements.canvasFrame) {
    return;
  }

  if (window.matchMedia('(max-width: 940px)').matches) {
    elements.canvasFrame.style.width = '';
    return;
  }

  const panelRect = elements.viewportPanel.getBoundingClientRect();
  const panelStyles = getComputedStyle(elements.viewportPanel);
  const horizontalPadding =
    parseFloat(panelStyles.paddingLeft) + parseFloat(panelStyles.paddingRight);
  const bottomPadding = parseFloat(panelStyles.paddingBottom);
  const viewportMargin = 8;
  const availableWidth = Math.max(280, elements.viewportPanel.clientWidth - horizontalPadding);
  const availableHeight = Math.max(
    180,
    window.innerHeight - panelRect.top - bottomPadding - viewportMargin,
  );
  const fittedWidth = clamp(
    Math.floor(Math.min(availableWidth, availableHeight * DISPLAY_ASPECT_RATIO)),
    280,
    availableWidth,
  );

  elements.canvasFrame.style.width = `${fittedWidth}px`;
}

let restartTimer = 0;
function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(startRender, 140);
}

function updateControlOutputs() {
  const profile = QUALITY_PROFILES[elements.qualityProfile.value];
  elements.qualityLabel.textContent = profile ? profile.label : 'Custom';
  elements.bouncesValue.textContent = elements.bouncesInput.value;
  elements.sampleTargetValue.textContent = elements.sampleTargetInput.value;
  elements.cameraYawValue.textContent = elements.cameraYawInput.value;
  elements.cameraHeightValue.textContent = Number(elements.cameraHeightInput.value).toFixed(1);
  elements.fovValue.textContent = elements.fovInput.value;
  elements.focusDistanceValue.textContent = Number(elements.focusDistanceInput.value).toFixed(1);
  elements.apertureValue.textContent = Number(elements.apertureInput.value).toFixed(2);
  elements.lightValue.textContent = Number(elements.lightInput.value).toFixed(1);
  elements.warmthValue.textContent = Number(elements.warmthInput.value).toFixed(2);
  elements.exposureValue.textContent = Number(elements.exposureInput.value).toFixed(2);
  elements.contrastValue.textContent = Number(elements.contrastInput.value).toFixed(2);
  elements.sceneLabel.textContent = elements.scenePreset.options[elements.scenePreset.selectedIndex].textContent;
}

function applyQualityProfile(profileKey, shouldRestart) {
  const profile = QUALITY_PROFILES[profileKey];
  if (!profile) {
    return;
  }

  elements.resolutionSelect.value = profile.resolution;
  elements.bouncesInput.value = profile.bounces;
  elements.sampleTargetInput.value = profile.samples;
  elements.fovInput.value = profile.fov;
  elements.focusDistanceInput.value = profile.focusDistance;
  elements.apertureInput.value = profile.aperture;
  updateControlOutputs();

  if (shouldRestart) {
    startRender();
  }
}

function startRender() {
  clearTimeout(restartTimer);
  state.jobId += 1;
  state.sample = 0;
  state.rays = 0;
  state.raysPerSecond = 0;
  state.rendering = true;
  state.paused = false;
  state.pauseRequested = false;
  state.frameStart = performance.now();
  state.renderStart = performance.now();
  state.activeTiles = 0;
  state.tileQueue = [];
  state.idleWorkers = [...state.workers];
  state.tileStats = new Map();
  state.currentConfig = null;
  state.currentScene = null;

  state.workers.forEach(worker => {
    worker.postMessage({ type: 'cancel', jobId: state.jobId - 1 });
  });

  const [width, height] = elements.resolutionSelect.value.split('x').map(Number);
  state.width = width;
  state.height = height;
  state.targetSamples = Number(elements.sampleTargetInput.value);
  canvas.width = width;
  canvas.height = height;
  fitCanvasToViewport();

  presenter.reset(width, height);

  updateMetrics(0);
  setStatus('Rendering', 'active');
  updatePauseButton();
  beginNextSample();
}

function beginNextSample() {
  if (!state.rendering || state.paused) {
    return;
  }

  if (state.sample >= state.targetSamples) {
    state.rendering = false;
    state.paused = false;
    state.pauseRequested = false;
    updateMetrics(0);
    setStatus('Complete', 'done');
    updatePauseButton();
    return;
  }

  state.sample += 1;
  state.currentConfig = buildRenderConfig({
    width: state.width,
    height: state.height,
    sample: state.sample,
    maxBounces: Number(elements.bouncesInput.value),
    cameraYaw: Number(elements.cameraYawInput.value),
    cameraHeight: Number(elements.cameraHeightInput.value),
    fov: Number(elements.fovInput.value),
    focusDistance: Number(elements.focusDistanceInput.value),
    aperture: Number(elements.apertureInput.value),
  });
  state.currentScene = buildScene({
    preset: elements.scenePreset.value,
    warmth: Number(elements.warmthInput.value),
    intensity: Number(elements.lightInput.value),
  });
  state.tileQueue = createTiles(state.width, state.height, TILE_SIZE)
    .filter(shouldRenderTile);
  state.activeTiles = 0;
  state.frameStart = performance.now();
  updateMetrics(0);

  if (state.tileQueue.length === 0) {
    state.rendering = false;
    state.paused = false;
    state.pauseRequested = false;
    presenter.drawAccumulation(getPresentationSettings());
    updateMetrics(0);
    setStatus('Converged', 'done');
    updatePauseButton();
    return;
  }

  dispatchTiles();
}

function dispatchTiles() {
  if (!state.rendering || state.paused || state.pauseRequested) {
    return;
  }

  while (state.idleWorkers.length > 0 && state.tileQueue.length > 0) {
    const worker = state.idleWorkers.pop();
    const tile = state.tileQueue.pop();
    state.activeTiles += 1;

    worker.postMessage({
      type: 'render',
      jobId: state.jobId,
      tile,
      config: state.currentConfig,
      scene: state.currentScene,
    });
  }
}

function handleWorkerMessage(event) {
  const message = event.data;
  if (message.type !== 'tile' || message.jobId !== state.jobId || state.paused) {
    return;
  }

  const worker = event.target;
  state.activeTiles -= 1;
  state.idleWorkers.push(worker);
  state.rays += message.rays;

  updateTileStats(message);
  presenter.mergeTile(message.tile, message.pixels);
  presenter.drawTile(message.tile, getPresentationSettings());
  updateMetrics(performance.now() - state.frameStart);

  if (state.tileQueue.length === 0 && state.activeTiles === 0) {
    presenter.drawAccumulation(getPresentationSettings());
    updateMetrics(performance.now() - state.frameStart);
    if (state.pauseRequested) {
      enterPausedState();
      return;
    }
    beginNextSample();
    return;
  }

  if (state.pauseRequested && state.activeTiles === 0) {
    enterPausedState();
    return;
  }

  dispatchTiles();
}

function handleWorkerError(error) {
  console.error(error.message);
  state.rendering = false;
  state.paused = false;
  state.pauseRequested = false;
  setStatus('Worker error', 'error');
  updatePauseButton();
}

function togglePause() {
  if (state.paused) {
    resumeRender();
    return;
  }

  if (state.rendering) {
    pauseRender();
  }
}

function pauseRender() {
  state.pauseRequested = true;
  setStatus('Pausing', 'paused');
  updatePauseButton();

  if (state.activeTiles === 0) {
    enterPausedState();
  }
}

function resumeRender() {
  if (!state.paused || state.sample >= state.targetSamples) {
    return;
  }

  state.rendering = true;
  state.paused = false;
  state.pauseRequested = false;
  state.frameStart = performance.now();
  setStatus('Rendering', 'active');
  updatePauseButton();
  if (state.tileQueue.length > 0) {
    dispatchTiles();
    return;
  }
  beginNextSample();
}

function enterPausedState() {
  state.rendering = false;
  state.paused = true;
  state.pauseRequested = false;
  setStatus('Paused', 'paused');
  updatePauseButton();
}

function updatePauseButton() {
  if (state.pauseRequested) {
    elements.pauseButton.textContent = 'Pausing...';
    elements.pauseButton.disabled = true;
    return;
  }

  if (state.paused) {
    elements.pauseButton.textContent = 'Resume render';
    elements.pauseButton.disabled = false;
    return;
  }

  elements.pauseButton.textContent = 'Pause render';
  elements.pauseButton.disabled = !state.rendering;
}

function shouldRenderTile(tile) {
  const stats = state.tileStats.get(tileKey(tile));

  if (!stats || stats.samples < ADAPTIVE_MIN_SAMPLES) {
    return true;
  }

  return stats.variance > ADAPTIVE_VARIANCE_THRESHOLD;
}

function updateTileStats(message) {
  const key = tileKey(message.tile);
  const previous = state.tileStats.get(key);
  const samples = previous ? previous.samples + 1 : 1;
  const variance = previous
    ? previous.variance * 0.82 + message.variance * 0.18
    : message.variance;
  const mean = previous
    ? previous.mean * 0.82 + message.mean * 0.18
    : message.mean;

  state.tileStats.set(key, { samples, variance, mean });
}

function tileKey(tile) {
  return `${tile.x0},${tile.y0}`;
}

function getPresentationSettings() {
  return {
    exposure: Number(elements.exposureInput.value),
    contrast: Number(elements.contrastInput.value),
    denoiseEnabled: elements.denoiseInput.checked,
    sample: state.sample,
  };
}

function updateMetrics(frameTime) {
  const elapsedSeconds = Math.max(0.001, (performance.now() - state.renderStart) / 1000);
  const progressRatio = Math.min(1, state.sample / Math.max(1, state.targetSamples));
  const progressPercent = Math.round(progressRatio * 100);
  const etaSeconds = state.rendering && state.sample > 1 && progressRatio > 0
    ? Math.max(0, elapsedSeconds / progressRatio - elapsedSeconds)
    : null;

  state.raysPerSecond = Math.round(state.rays / elapsedSeconds);
  elements.samplesMetric.textContent = `${state.sample} / ${state.targetSamples}`;
  elements.raysMetric.textContent = formatNumber(state.rays);
  elements.raysPerSecondMetric.textContent = formatNumber(state.raysPerSecond);
  elements.workersMetric.textContent = String(state.workers.length);
  elements.sampleBadge.textContent = `${state.sample} / ${state.targetSamples} samples`;
  elements.progressBar.style.width = `${progressPercent}%`;
  elements.elapsedBadge.textContent = `Elapsed ${formatDuration(elapsedSeconds)}`;
  elements.etaBadge.textContent = state.rendering
    ? `ETA ${etaSeconds === null ? '--' : formatDuration(etaSeconds)}`
    : 'Done';
}

function setStatus(label, mode) {
  elements.status.textContent = label;
  elements.status.className = `status-pill ${mode || ''}`.trim();
}

function exportPng() {
  const link = document.createElement('a');
  link.download = `ray-tracing-studio-${state.width}x${state.height}-${state.sample}-samples.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function exportMetadata() {
  const metadata = {
    project: '001 - Ray Tracing Studio',
    exportedAt: new Date().toISOString(),
    renderer: {
      language: 'Vanilla JavaScript',
      canvas: '2D Canvas',
      workers: state.workers.length,
      tileSize: TILE_SIZE,
      toneMapping: 'ACES filmic',
      adaptiveSampling: {
        minSamples: ADAPTIVE_MIN_SAMPLES,
        varianceThreshold: ADAPTIVE_VARIANCE_THRESHOLD,
      },
      presentation: {
        batchedCanvasPaint: true,
        denoiseEnabled: elements.denoiseInput.checked,
        viewportFit: true,
      },
    },
    status: {
      samples: state.sample,
      targetSamples: state.targetSamples,
      progressPercent: Math.round((state.sample / Math.max(1, state.targetSamples)) * 100),
      elapsedSeconds: Number(((performance.now() - state.renderStart) / 1000).toFixed(2)),
      rays: state.rays,
      raysPerSecond: state.raysPerSecond,
      width: state.width,
      height: state.height,
      paused: state.paused,
      pauseRequested: state.pauseRequested,
      rendering: state.rendering,
    },
    settings: getCurrentSettings(),
  };
  const blob = new Blob([`${JSON.stringify(metadata, null, 2)}\n`], { type: 'application/json' });
  downloadBlob(blob, `ray-tracing-studio-${state.width}x${state.height}-${state.sample}-samples.json`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCurrentSettings() {
  return {
    scene: elements.scenePreset.value,
    profile: elements.qualityProfile.value,
    resolution: elements.resolutionSelect.value,
    bounces: Number(elements.bouncesInput.value),
    targetSamples: Number(elements.sampleTargetInput.value),
    cameraYaw: Number(elements.cameraYawInput.value),
    cameraHeight: Number(elements.cameraHeightInput.value),
    fov: Number(elements.fovInput.value),
    focusDistance: Number(elements.focusDistanceInput.value),
    aperture: Number(elements.apertureInput.value),
    lightIntensity: Number(elements.lightInput.value),
    warmth: Number(elements.warmthInput.value),
    exposure: Number(elements.exposureInput.value),
    contrast: Number(elements.contrastInput.value),
    denoise: elements.denoiseInput.checked,
  };
}

initialize();
