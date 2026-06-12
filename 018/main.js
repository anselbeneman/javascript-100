const canvas = document.getElementById('waveCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  gridBadge: document.getElementById('gridBadge'),
  seedBadge: document.getElementById('seedBadge'),
  gridValue: document.getElementById('gridValue'),
  stepValue: document.getElementById('stepValue'),
  energyValue: document.getElementById('energyValue'),
  amplitudeValue: document.getElementById('amplitudeValue'),
  activeValue: document.getElementById('activeValue'),
  blockedValue: document.getElementById('blockedValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  gridRange: document.getElementById('gridRange'),
  stepRange: document.getElementById('stepRange'),
  speedRange: document.getElementById('speedRange'),
  dampingRange: document.getElementById('dampingRange'),
  obstacleToggle: document.getElementById('obstacleToggle'),
  historyToggle: document.getElementById('historyToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  gridControlValue: document.getElementById('gridControlValue'),
  stepControlValue: document.getElementById('stepControlValue'),
  speedValue: document.getElementById('speedValue'),
  dampingValue: document.getElementById('dampingValue'),
};

const state = {
  seed: 18,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    size: numberValue(elements.gridRange),
    steps: numberValue(elements.stepRange),
    waveSpeed: numberValue(elements.speedRange) / 100,
    damping: numberValue(elements.dampingRange) / 1000,
    seed: state.seed,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.gridControlValue.textContent = String(settings.size);
  elements.stepControlValue.textContent = String(settings.steps);
  elements.speedValue.textContent = settings.waveSpeed.toFixed(2);
  elements.dampingValue.textContent = settings.damping.toFixed(3);
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

function runSolver() {
  updateLabels();
  state.summary = WaveCore.summarize(getSettings());
  updateMetrics();
  draw();
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0b0c11');
  gradient.addColorStop(0.5, '#101019');
  gradient.addColorStop(1, '#19151d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function colorFor(value, blocked) {
  if (blocked) return [12, 16, 18, 255];

  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    return [
      Math.round(24 + v * 231),
      Math.round(58 + v * 188),
      Math.round(98 + v * 70),
      255,
    ];
  }

  const n = -v;
  return [
    Math.round(24 + n * 60),
    Math.round(48 + n * 145),
    Math.round(92 + n * 163),
    255,
  ];
}

function drawField() {
  if (!state.summary) return;

  const field = state.summary.field;
  const size = field.size;
  const image = context.createImageData(size, size);

  for (let index = 0; index < field.current.length; index += 1) {
    const color = colorFor(field.current[index] * 1.8, elements.obstacleToggle.checked && field.obstacle[index]);
    const offset = index * 4;
    image.data[offset] = color[0];
    image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = color[3];
  }

  const side = Math.min(canvas.width - 48, canvas.height - 48);
  const left = (canvas.width - side) * 0.5;
  const top = (canvas.height - side) * 0.48;
  const scratch = document.createElement('canvas');
  scratch.width = size;
  scratch.height = size;
  scratch.getContext('2d').putImageData(image, 0, 0);

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(scratch, left, top, side, side);
  context.strokeStyle = 'rgba(255, 222, 67, 0.36)';
  context.lineWidth = 1;
  context.strokeRect(left, top, side, side);
  context.restore();
}

function drawHistory() {
  if (!state.summary || !elements.historyToggle.checked) return;

  const history = state.summary.history;
  const left = 24;
  const top = canvas.height - 124;
  const width = Math.min(380, canvas.width * 0.4);
  const height = 86;
  const maxEnergy = Math.max(...history.map((point) => point.energy), 0.001);

  context.save();
  context.fillStyle = 'rgba(5, 7, 11, 0.74)';
  context.strokeStyle = 'rgba(255, 222, 67, 0.22)';
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  context.strokeStyle = '#ffde43';
  context.lineWidth = 2;
  context.beginPath();
  history.forEach((point, index) => {
    const x = left + index / Math.max(1, history.length - 1) * width;
    const y = top + height - point.energy / maxEnergy * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = '#c8d0d6';
  context.font = '800 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('energy trace', left + 10, top + 18);
  context.restore();
}

function draw() {
  drawBackground();
  drawField();
  drawHistory();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.gridValue.textContent = `${state.summary.settings.size} x ${state.summary.settings.size}`;
  elements.stepValue.textContent = String(metrics.steps);
  elements.energyValue.textContent = metrics.energy.toFixed(2);
  elements.amplitudeValue.textContent = metrics.maxAmplitude.toFixed(3);
  elements.activeValue.textContent = `${Math.round(metrics.activeRatio * 100)}%`;
  elements.blockedValue.textContent = String(metrics.blockedCells);
  elements.gridBadge.textContent = `${state.summary.settings.size} x ${state.summary.settings.size}`;
  elements.statusValue.textContent = 'Solved';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = WaveCore.benchmarkWave({
    ...getSettings(),
    iterations: 8,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(1)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '018 - Wave Equation Lab',
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
  downloadBlob('wave-equation-lab.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'wave-equation-lab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 018 - Wave Equation Lab',
    `Grid: ${metadata.settings.size} x ${metadata.settings.size}`,
    `Steps: ${metrics.steps || 0}`,
    `Energy: ${metrics.energy ? metrics.energy.toFixed(4) : '0'}`,
    `Max amplitude: ${metrics.maxAmplitude ? metrics.maxAmplitude.toFixed(5) : '0'}`,
    `Active ratio: ${metrics.activeRatio ? `${(metrics.activeRatio * 100).toFixed(1)}%` : '0%'}`,
    `Blocked cells: ${metrics.blockedCells || 0}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(2)} ms/run` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('wave-equation-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', runSolver);
  [elements.gridRange, elements.stepRange, elements.speedRange, elements.dampingRange].forEach((element) => {
    element.addEventListener('input', runSolver);
    element.addEventListener('change', runSolver);
  });

  [elements.obstacleToggle, elements.historyToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.runButton.addEventListener('click', runSolver);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    runSolver();
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
runSolver();
