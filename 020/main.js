const canvas = document.getElementById('clothCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  particleBadge: document.getElementById('particleBadge'),
  seedBadge: document.getElementById('seedBadge'),
  particleValue: document.getElementById('particleValue'),
  constraintValue: document.getElementById('constraintValue'),
  pinnedValue: document.getElementById('pinnedValue'),
  averageStretchValue: document.getElementById('averageStretchValue'),
  maxStretchValue: document.getElementById('maxStretchValue'),
  kineticValue: document.getElementById('kineticValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  pinSelect: document.getElementById('pinSelect'),
  colsRange: document.getElementById('colsRange'),
  rowsRange: document.getElementById('rowsRange'),
  stepRange: document.getElementById('stepRange'),
  iterationRange: document.getElementById('iterationRange'),
  windRange: document.getElementById('windRange'),
  pointsToggle: document.getElementById('pointsToggle'),
  stressToggle: document.getElementById('stressToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  colsValue: document.getElementById('colsValue'),
  rowsValue: document.getElementById('rowsValue'),
  stepValue: document.getElementById('stepValue'),
  iterationValue: document.getElementById('iterationValue'),
  windValue: document.getElementById('windValue'),
};

const state = {
  seed: 20,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    pinMode: elements.pinSelect.value,
    cols: numberValue(elements.colsRange),
    rows: numberValue(elements.rowsRange),
    steps: numberValue(elements.stepRange),
    iterations: numberValue(elements.iterationRange),
    wind: numberValue(elements.windRange) / 100,
    gravity: 0.58,
    seed: state.seed,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.colsValue.textContent = String(settings.cols);
  elements.rowsValue.textContent = String(settings.rows);
  elements.stepValue.textContent = String(settings.steps);
  elements.iterationValue.textContent = String(settings.iterations);
  elements.windValue.textContent = settings.wind.toFixed(2);
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

function runSimulation() {
  updateLabels();
  state.summary = ClothCore.summarize(getSettings());
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
  gradient.addColorStop(0, '#080d12');
  gradient.addColorStop(0.52, '#10131b');
  gradient.addColorStop(1, '#18151d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawObstacle() {
  if (!state.summary) return;
  const obstacle = state.summary.cloth.obstacle;
  const center = toCanvas(obstacle);
  const radius = obstacle.radius * Math.min(canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(255, 222, 67, 0.55)';
  context.fillStyle = 'rgba(255, 222, 67, 0.08)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawCloth() {
  if (!state.summary) return;

  const cloth = state.summary.cloth;
  context.save();
  cloth.constraints.forEach((constraint) => {
    if (constraint.stiffness < 0.9) return;
    const a = cloth.particles[constraint.a];
    const b = cloth.particles[constraint.b];
    const screenA = toCanvas(a);
    const screenB = toCanvas(b);
    const stretch = Math.abs(ClothCore.distance(a, b) - constraint.rest) / constraint.rest;

    context.strokeStyle = elements.stressToggle.checked
      ? `rgba(${Math.min(255, 90 + stretch * 900)}, ${Math.max(90, 230 - stretch * 500)}, 210, 0.82)`
      : 'rgba(110, 231, 255, 0.62)';
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(screenA.x, screenA.y);
    context.lineTo(screenB.x, screenB.y);
    context.stroke();
  });

  if (elements.pointsToggle.checked) {
    cloth.particles.forEach((particle) => {
      const screen = toCanvas(particle);
      context.fillStyle = particle.pinned ? '#ffde43' : '#6ee7ff';
      context.beginPath();
      context.arc(screen.x, screen.y, particle.pinned ? 4.2 : 2.5, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.restore();
}

function drawHistory() {
  if (!state.summary) return;
  const history = state.summary.history;
  const left = 24;
  const top = canvas.height - 126;
  const width = Math.min(360, canvas.width * 0.38);
  const height = 88;
  const maxStretch = Math.max(...history.map((point) => point.maxStretch), 0.001);

  context.save();
  context.fillStyle = 'rgba(6, 8, 12, 0.74)';
  context.strokeStyle = 'rgba(110, 231, 255, 0.18)';
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  context.strokeStyle = '#6ee7ff';
  context.lineWidth = 2;
  context.beginPath();
  history.forEach((point, index) => {
    const x = left + index / Math.max(1, history.length - 1) * width;
    const y = top + height - point.maxStretch / maxStretch * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = '#bfc9d2';
  context.font = '800 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('max stretch trace', left + 10, top + 18);
  context.restore();
}

function draw() {
  drawBackground();
  drawObstacle();
  drawCloth();
  drawHistory();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.particleValue.textContent = String(metrics.particles);
  elements.constraintValue.textContent = String(metrics.constraints);
  elements.pinnedValue.textContent = String(metrics.pinned);
  elements.averageStretchValue.textContent = metrics.averageStretch.toFixed(4);
  elements.maxStretchValue.textContent = metrics.maxStretch.toFixed(4);
  elements.kineticValue.textContent = metrics.kineticEnergy.toFixed(5);
  elements.particleBadge.textContent = `${metrics.particles} particles`;
  elements.statusValue.textContent = 'Solved';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = ClothCore.benchmarkCloth({
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
    project: '020 - Verlet Cloth Solver',
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
  downloadBlob('verlet-cloth-solver.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'verlet-cloth-solver.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 020 - Verlet Cloth Solver',
    `Particles: ${metrics.particles || 0}`,
    `Constraints: ${metrics.constraints || 0}`,
    `Pinned: ${metrics.pinned || 0}`,
    `Average stretch: ${metrics.averageStretch ? metrics.averageStretch.toFixed(5) : '0'}`,
    `Maximum stretch: ${metrics.maxStretch ? metrics.maxStretch.toFixed(5) : '0'}`,
    `Kinetic energy: ${metrics.kineticEnergy ? metrics.kineticEnergy.toFixed(6) : '0'}`,
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
    downloadBlob('verlet-cloth-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.pinSelect.addEventListener('change', runSimulation);
  [elements.colsRange, elements.rowsRange, elements.stepRange, elements.iterationRange, elements.windRange].forEach((element) => {
    element.addEventListener('input', runSimulation);
    element.addEventListener('change', runSimulation);
  });

  [elements.pointsToggle, elements.stressToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.runButton.addEventListener('click', runSimulation);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    runSimulation();
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
runSimulation();
