const canvas = document.getElementById('kalmanCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  stepBadge: document.getElementById('stepBadge'),
  seedBadge: document.getElementById('seedBadge'),
  rawValue: document.getElementById('rawValue'),
  filteredValue: document.getElementById('filteredValue'),
  improvementValue: document.getElementById('improvementValue'),
  residualValue: document.getElementById('residualValue'),
  gainValue: document.getElementById('gainValue'),
  stepsValue: document.getElementById('stepsValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  stepRange: document.getElementById('stepRange'),
  noiseRange: document.getElementById('noiseRange'),
  processRange: document.getElementById('processRange'),
  truthToggle: document.getElementById('truthToggle'),
  measurementToggle: document.getElementById('measurementToggle'),
  covarianceToggle: document.getElementById('covarianceToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  stepControlValue: document.getElementById('stepControlValue'),
  noiseValue: document.getElementById('noiseValue'),
  processValue: document.getElementById('processValue'),
};

const presets = {
  balanced: { steps: 180, noise: 0.07, processNoise: 0.018 },
  noisy: { steps: 220, noise: 0.14, processNoise: 0.026 },
  smooth: { steps: 170, noise: 0.045, processNoise: 0.009 },
  agile: { steps: 260, noise: 0.075, processNoise: 0.052 },
};

const state = {
  seed: 14,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    steps: numberValue(elements.stepRange),
    noise: numberValue(elements.noiseRange) / 100,
    processNoise: numberValue(elements.processRange) / 1000,
    seed: state.seed,
  };
}

function applyPresetControls() {
  const preset = presets[elements.presetSelect.value];
  elements.stepRange.value = String(preset.steps);
  elements.noiseRange.value = String(Math.round(preset.noise * 100));
  elements.processRange.value = String(Math.round(preset.processNoise * 1000));
}

function updateLabels() {
  const settings = getSettings();
  elements.stepControlValue.textContent = String(settings.steps);
  elements.noiseValue.textContent = `${Math.round(settings.noise * 100)}%`;
  elements.processValue.textContent = String(Math.round(settings.processNoise * 1000));
  elements.seedBadge.textContent = `Seed ${settings.seed}`;
}

function resizeCanvas() {
  const rect = frame.getBoundingClientRect();
  const width = Math.max(720, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    draw();
  }
}

function runFilter() {
  updateLabels();
  state.summary = KalmanCore.summarize(getSettings());
  updateMetrics();
  draw();
}

function toCanvas(point) {
  return {
    x: point.x * canvas.width,
    y: point.y * canvas.height,
  };
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#07101b');
  gradient.addColorStop(0.58, '#0b141f');
  gradient.addColorStop(1, '#151625');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(120, 205, 255, 0.08)';
  context.lineWidth = 1;
  const spacing = 48;

  for (let x = 0; x <= canvas.width; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = 0; y <= canvas.height; y += spacing) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();
}

function drawPath(points, color, width, dash = []) {
  if (!points.length) return;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.setLineDash(dash);
  context.beginPath();
  points.forEach((point, index) => {
    const screen = toCanvas(point);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.stroke();
  context.restore();
}

function drawMeasurements(points) {
  if (!elements.measurementToggle.checked) return;

  context.save();
  context.fillStyle = 'rgba(255, 109, 134, 0.55)';
  const stride = Math.max(1, Math.floor(points.length / 120));

  points.forEach((point, index) => {
    if (index % stride !== 0) return;
    const screen = toCanvas(point);
    context.fillRect(screen.x - 1.5, screen.y - 1.5, 3, 3);
  });
  context.restore();
}

function drawCovariance(points) {
  if (!elements.covarianceToggle.checked) return;

  context.save();
  context.strokeStyle = 'rgba(255, 222, 67, 0.32)';
  context.lineWidth = 1;
  const stride = Math.max(8, Math.floor(points.length / 20));

  points.forEach((point, index) => {
    if (index % stride !== 0) return;
    const screen = toCanvas(point);
    const radiusX = Math.sqrt(point.pxx) * canvas.width * 2.4;
    const radiusY = Math.sqrt(point.pyy) * canvas.height * 2.4;
    context.beginPath();
    context.ellipse(screen.x, screen.y, Math.max(4, radiusX), Math.max(4, radiusY), 0, 0, Math.PI * 2);
    context.stroke();
  });
  context.restore();
}

function drawLegend() {
  const items = [
    ['Truth', '#7cffd6'],
    ['Measured', '#ff6d86'],
    ['Kalman', '#ffde43'],
  ];

  context.save();
  context.font = '800 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  items.forEach((item, index) => {
    const x = 24 + index * 116;
    const y = canvas.height - 24;
    context.fillStyle = item[1];
    context.fillRect(x, y - 9, 22, 3);
    context.fillStyle = '#dfeaf0';
    context.fillText(item[0], x + 30, y - 3);
  });
  context.restore();
}

function draw() {
  drawBackground();
  if (!state.summary) return;

  const { truth, measurements } = state.summary.track;
  const { filtered } = state.summary.filter;
  drawMeasurements(measurements);
  if (elements.truthToggle.checked) drawPath(truth, 'rgba(124, 255, 214, 0.75)', 2.2, [8, 8]);
  drawCovariance(filtered);
  drawPath(filtered, '#ffde43', 3.2);
  drawLegend();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.rawValue.textContent = metrics.measurementRmse.toFixed(3);
  elements.filteredValue.textContent = metrics.filteredRmse.toFixed(3);
  elements.improvementValue.textContent = `${Math.round(metrics.improvement * 100)}%`;
  elements.residualValue.textContent = metrics.averageResidual.toFixed(3);
  elements.gainValue.textContent = metrics.finalGain.toFixed(2);
  elements.stepsValue.textContent = String(metrics.steps);
  elements.stepBadge.textContent = `${metrics.steps} steps`;
  elements.statusValue.textContent = 'Filtered';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = KalmanCore.benchmarkFilter({
    ...getSettings(),
    iterations: 120,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(3)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '014 - Kalman Filter Lab',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    metrics: state.summary ? state.summary.metrics : null,
    benchmark: state.benchmark,
  };
}

function downloadBlob(name, type, contents) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadBlob('kalman-filter-lab.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'kalman-filter-lab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 014 - Kalman Filter Lab',
    `Raw measurement RMSE: ${metrics.measurementRmse ? metrics.measurementRmse.toFixed(4) : '0'}`,
    `Filtered RMSE: ${metrics.filteredRmse ? metrics.filteredRmse.toFixed(4) : '0'}`,
    `Improvement: ${metrics.improvement ? `${(metrics.improvement * 100).toFixed(1)}%` : '0%'}`,
    `Average residual: ${metrics.averageResidual ? metrics.averageResidual.toFixed(4) : '0'}`,
    `Final gain: ${metrics.finalGain ? metrics.finalGain.toFixed(3) : '0'}`,
    `Steps: ${metrics.steps || 0}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(4)} ms/filter` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('kalman-filter-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', () => {
    applyPresetControls();
    runFilter();
  });

  [elements.stepRange, elements.noiseRange, elements.processRange].forEach((element) => {
    element.addEventListener('input', runFilter);
    element.addEventListener('change', runFilter);
  });

  [elements.truthToggle, elements.measurementToggle, elements.covarianceToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.runButton.addEventListener('click', runFilter);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    runFilter();
  });
  elements.pngButton.addEventListener('click', exportPng);
  elements.jsonButton.addEventListener('click', exportJson);
  elements.reportButton.addEventListener('click', () => {
    copyReport().catch(() => {
      elements.statusValue.textContent = 'Copy blocked';
    });
  });
  window.addEventListener('resize', resizeCanvas);
}

attachEvents();
resizeCanvas();
applyPresetControls();
runFilter();
