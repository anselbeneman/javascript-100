const canvas = document.getElementById('routeCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  generationBadge: document.getElementById('generationBadge'),
  seedBadge: document.getElementById('seedBadge'),
  cityValue: document.getElementById('cityValue'),
  bestValue: document.getElementById('bestValue'),
  initialValue: document.getElementById('initialValue'),
  improvementValue: document.getElementById('improvementValue'),
  baselineValue: document.getElementById('baselineValue'),
  populationValue: document.getElementById('populationValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  cityRange: document.getElementById('cityRange'),
  populationRange: document.getElementById('populationRange'),
  generationRange: document.getElementById('generationRange'),
  mutationRange: document.getElementById('mutationRange'),
  baselineToggle: document.getElementById('baselineToggle'),
  historyToggle: document.getElementById('historyToggle'),
  labelsToggle: document.getElementById('labelsToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  cityControlValue: document.getElementById('cityControlValue'),
  populationControlValue: document.getElementById('populationControlValue'),
  generationControlValue: document.getElementById('generationControlValue'),
  mutationValue: document.getElementById('mutationValue'),
};

const presets = {
  balanced: { cityCount: 28, populationSize: 72, generations: 120, mutationRate: 0.14 },
  dense: { cityCount: 48, populationSize: 120, generations: 220, mutationRate: 0.16 },
  fast: { cityCount: 18, populationSize: 42, generations: 70, mutationRate: 0.18 },
  long: { cityCount: 36, populationSize: 140, generations: 320, mutationRate: 0.11 },
};

const state = {
  seed: 15,
  result: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    cityCount: numberValue(elements.cityRange),
    populationSize: numberValue(elements.populationRange),
    generations: numberValue(elements.generationRange),
    mutationRate: numberValue(elements.mutationRange) / 100,
    seed: state.seed,
  };
}

function applyPresetControls() {
  const preset = presets[elements.presetSelect.value];
  elements.cityRange.value = String(preset.cityCount);
  elements.populationRange.value = String(preset.populationSize);
  elements.generationRange.value = String(preset.generations);
  elements.mutationRange.value = String(Math.round(preset.mutationRate * 100));
}

function updateLabels() {
  const settings = getSettings();
  elements.cityControlValue.textContent = String(settings.cityCount);
  elements.populationControlValue.textContent = String(settings.populationSize);
  elements.generationControlValue.textContent = String(settings.generations);
  elements.mutationValue.textContent = `${Math.round(settings.mutationRate * 100)}%`;
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

function runOptimizer() {
  updateLabels();
  state.result = GeneticCore.runEvolution(getSettings());
  updateMetrics();
  draw();
}

function toCanvas(city) {
  const margin = 44;
  return {
    x: margin + city.x * (canvas.width - margin * 2),
    y: margin + city.y * (canvas.height - margin * 2),
  };
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#09100b');
  gradient.addColorStop(0.56, '#0f1510');
  gradient.addColorStop(1, '#17170f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(189, 255, 128, 0.08)';
  context.lineWidth = 1;
  const spacing = 52;

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

function drawRoute(route, color, width, dash = []) {
  if (!state.result || !route.length) return;
  const { cities } = state.result;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.setLineDash(dash);
  context.lineJoin = 'round';
  context.beginPath();
  route.forEach((cityId, index) => {
    const city = toCanvas(cities[cityId]);
    if (index === 0) context.moveTo(city.x, city.y);
    else context.lineTo(city.x, city.y);
  });
  const first = toCanvas(cities[route[0]]);
  context.lineTo(first.x, first.y);
  context.stroke();
  context.restore();
}

function drawCities() {
  if (!state.result) return;

  context.save();
  state.result.cities.forEach((city) => {
    const screen = toCanvas(city);
    context.beginPath();
    context.arc(screen.x, screen.y, 5.2, 0, Math.PI * 2);
    context.fillStyle = '#ffde43';
    context.fill();
    context.strokeStyle = '#071009';
    context.lineWidth = 2;
    context.stroke();

    if (elements.labelsToggle.checked) {
      context.fillStyle = '#f7ffe8';
      context.font = '800 10px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.fillText(String(city.id), screen.x + 7, screen.y - 7);
    }
  });
  context.restore();
}

function drawHistory() {
  if (!state.result || !elements.historyToggle.checked) return;

  const history = state.result.history;
  const left = 26;
  const top = canvas.height - 156;
  const width = Math.min(360, canvas.width * 0.38);
  const height = 104;
  const min = Math.min(...history.map((point) => point.bestLength));
  const max = Math.max(...history.map((point) => point.averageLength));
  const range = Math.max(max - min, 0.0001);

  context.save();
  context.fillStyle = 'rgba(3, 8, 5, 0.72)';
  context.strokeStyle = 'rgba(189, 255, 128, 0.2)';
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  context.strokeStyle = '#baff73';
  context.lineWidth = 2;
  context.beginPath();
  history.forEach((point, index) => {
    const x = left + index / Math.max(1, history.length - 1) * width;
    const y = top + height - (point.bestLength - min) / range * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = '#b9c8a7';
  context.font = '800 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('convergence', left + 10, top + 18);
  context.restore();
}

function drawLegend() {
  const items = [
    ['Best route', '#baff73'],
    ['Nearest baseline', 'rgba(255, 109, 134, 0.55)'],
  ];

  context.save();
  context.font = '800 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  items.forEach((item, index) => {
    const x = 24 + index * 172;
    const y = 30;
    context.strokeStyle = item[1];
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 26, y);
    context.stroke();
    context.fillStyle = '#f2f8e7';
    context.fillText(item[0], x + 36, y + 4);
  });
  context.restore();
}

function draw() {
  drawBackground();
  if (!state.result) return;

  if (elements.baselineToggle.checked) {
    drawRoute(state.result.baselineRoute, 'rgba(255, 109, 134, 0.55)', 1.6, [7, 9]);
  }
  drawRoute(state.result.bestRoute, '#baff73', 3.2);
  drawCities();
  drawHistory();
  drawLegend();
}

function updateMetrics() {
  if (!state.result) return;

  elements.cityValue.textContent = String(state.result.cities.length);
  elements.bestValue.textContent = state.result.bestLength.toFixed(3);
  elements.initialValue.textContent = state.result.initialBestLength.toFixed(3);
  elements.improvementValue.textContent = `${Math.round(state.result.improvement * 100)}%`;
  elements.baselineValue.textContent = state.result.baselineLength.toFixed(3);
  elements.populationValue.textContent = String(state.result.settings.populationSize);
  elements.generationBadge.textContent = `${state.result.settings.generations} generations`;
  elements.statusValue.textContent = 'Optimized';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = GeneticCore.benchmarkEvolution({
    ...getSettings(),
    iterations: 10,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(1)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '015 - Genetic Route Optimizer',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    metrics: state.result ? {
      bestLength: state.result.bestLength,
      initialBestLength: state.result.initialBestLength,
      baselineLength: state.result.baselineLength,
      improvement: state.result.improvement,
      baselineGap: state.result.baselineGap,
      generations: state.result.settings.generations,
    } : null,
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
  downloadBlob('genetic-route-optimizer.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'genetic-route-optimizer.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 015 - Genetic Route Optimizer',
    `Best route length: ${metrics.bestLength ? metrics.bestLength.toFixed(4) : '0'}`,
    `Initial best length: ${metrics.initialBestLength ? metrics.initialBestLength.toFixed(4) : '0'}`,
    `Improvement: ${metrics.improvement ? `${(metrics.improvement * 100).toFixed(1)}%` : '0%'}`,
    `Nearest baseline length: ${metrics.baselineLength ? metrics.baselineLength.toFixed(4) : '0'}`,
    `Generations: ${metrics.generations || 0}`,
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
    downloadBlob('genetic-route-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', () => {
    applyPresetControls();
    runOptimizer();
  });

  [elements.cityRange, elements.populationRange, elements.generationRange, elements.mutationRange].forEach((element) => {
    element.addEventListener('input', runOptimizer);
    element.addEventListener('change', runOptimizer);
  });

  [elements.baselineToggle, elements.historyToggle, elements.labelsToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.runButton.addEventListener('click', runOptimizer);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    runOptimizer();
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
runOptimizer();
