const canvas = document.getElementById('fourierCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  harmonicBadge: document.getElementById('harmonicBadge'),
  seedBadge: document.getElementById('seedBadge'),
  sampleValue: document.getElementById('sampleValue'),
  harmonicValue: document.getElementById('harmonicValue'),
  errorValue: document.getElementById('errorValue'),
  lowErrorValue: document.getElementById('lowErrorValue'),
  dominantValue: document.getElementById('dominantValue'),
  compressionValue: document.getElementById('compressionValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  sampleRange: document.getElementById('sampleRange'),
  harmonicRange: document.getElementById('harmonicRange'),
  phaseRange: document.getElementById('phaseRange'),
  sourceToggle: document.getElementById('sourceToggle'),
  epicycleToggle: document.getElementById('epicycleToggle'),
  spectrumToggle: document.getElementById('spectrumToggle'),
  renderButton: document.getElementById('renderButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  sampleControlValue: document.getElementById('sampleControlValue'),
  harmonicControlValue: document.getElementById('harmonicControlValue'),
  phaseValue: document.getElementById('phaseValue'),
};

const state = {
  seed: 16,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    count: numberValue(elements.sampleRange),
    harmonics: numberValue(elements.harmonicRange),
    phase: numberValue(elements.phaseRange) / 100,
    seed: state.seed,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.sampleControlValue.textContent = String(settings.count);
  elements.harmonicControlValue.textContent = String(settings.harmonics);
  elements.phaseValue.textContent = `${Math.round(settings.phase * 100)}%`;
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

function renderFourier() {
  updateLabels();
  state.summary = FourierCore.summarize(getSettings());
  updateMetrics();
  draw();
}

function toCanvas(point) {
  const scale = Math.min(canvas.width, canvas.height) * 0.36;
  return {
    x: canvas.width * 0.5 + point.x * scale,
    y: canvas.height * 0.48 + point.y * scale,
  };
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071018');
  gradient.addColorStop(0.55, '#0b121e');
  gradient.addColorStop(1, '#151426');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(102, 232, 255, 0.08)';
  context.lineWidth = 1;
  const spacing = 50;

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
  context.closePath();
  context.stroke();
  context.restore();
}

function drawEpicycles() {
  if (!state.summary || !elements.epicycleToggle.checked) return;

  const settings = getSettings();
  const point = FourierCore.reconstructPoint(
    state.summary.coefficients,
    settings.phase,
    state.summary.metrics.harmonics,
  );

  context.save();
  const scale = Math.min(canvas.width, canvas.height) * 0.36;
  point.chain.slice(0, 36).forEach((segment) => {
    const from = toCanvas(segment.from);
    const to = toCanvas(segment.to);
    context.strokeStyle = 'rgba(255, 222, 67, 0.24)';
    context.lineWidth = 1;
    context.beginPath();
    context.arc(from.x, from.y, Math.abs(segment.radius) * scale, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = 'rgba(255, 222, 67, 0.72)';
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });

  const tip = toCanvas(point);
  context.fillStyle = '#ffde43';
  context.beginPath();
  context.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSpectrum() {
  if (!state.summary || !elements.spectrumToggle.checked) return;

  const coefficients = state.summary.coefficients.slice(0, 48);
  const left = 24;
  const top = canvas.height - 130;
  const width = Math.min(420, canvas.width * 0.42);
  const height = 92;
  const maxAmplitude = Math.max(...coefficients.map((item) => item.amplitude), 0.001);
  const barWidth = width / coefficients.length;

  context.save();
  context.fillStyle = 'rgba(3, 9, 15, 0.72)';
  context.strokeStyle = 'rgba(102, 232, 255, 0.18)';
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  coefficients.forEach((coefficient, index) => {
    const barHeight = coefficient.amplitude / maxAmplitude * (height - 20);
    context.fillStyle = coefficient.frequency < 0 ? '#ff7890' : '#66e8ff';
    context.fillRect(left + index * barWidth, top + height - barHeight, Math.max(2, barWidth - 2), barHeight);
  });

  context.fillStyle = '#aebcc8';
  context.font = '800 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('dominant harmonics', left + 10, top + 18);
  context.restore();
}

function draw() {
  drawBackground();
  if (!state.summary) return;

  if (elements.sourceToggle.checked) {
    drawPath(state.summary.points, 'rgba(164, 178, 191, 0.48)', 2, [7, 8]);
  }
  drawPath(state.summary.reconstructed, '#66e8ff', 3);
  drawEpicycles();
  drawSpectrum();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.sampleValue.textContent = String(metrics.samples);
  elements.harmonicValue.textContent = String(metrics.harmonics);
  elements.errorValue.textContent = metrics.partialError.toFixed(4);
  elements.lowErrorValue.textContent = metrics.lowError.toFixed(4);
  elements.dominantValue.textContent = String(metrics.dominantFrequency);
  elements.compressionValue.textContent = `${Math.round(metrics.compressionRatio * 100)}%`;
  elements.harmonicBadge.textContent = `${metrics.harmonics} harmonics`;
  elements.statusValue.textContent = 'Reconstructed';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = FourierCore.benchmarkFourier({
    ...getSettings(),
    iterations: 12,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '016 - Fourier Epicycle Studio',
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
  downloadBlob('fourier-epicycle-studio.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'fourier-epicycle-studio.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 016 - Fourier Epicycle Studio',
    `Samples: ${metrics.samples || 0}`,
    `Harmonics: ${metrics.harmonics || 0}`,
    `Dominant frequency: ${metrics.dominantFrequency || 0}`,
    `Partial RMSE: ${metrics.partialError ? metrics.partialError.toFixed(5) : '0'}`,
    `Full RMSE: ${metrics.fullError ? metrics.fullError.toFixed(8) : '0'}`,
    `Compression ratio: ${metrics.compressionRatio ? `${(metrics.compressionRatio * 100).toFixed(1)}%` : '0%'}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(3)} ms/transform` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('fourier-epicycle-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', renderFourier);
  [elements.sampleRange, elements.harmonicRange, elements.phaseRange].forEach((element) => {
    element.addEventListener('input', renderFourier);
    element.addEventListener('change', renderFourier);
  });

  [elements.sourceToggle, elements.epicycleToggle, elements.spectrumToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.renderButton.addEventListener('click', renderFourier);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    renderFourier();
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
renderFourier();
