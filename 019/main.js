const canvas = document.getElementById('flockCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  agentBadge: document.getElementById('agentBadge'),
  seedBadge: document.getElementById('seedBadge'),
  agentValue: document.getElementById('agentValue'),
  neighborValue: document.getElementById('neighborValue'),
  checkValue: document.getElementById('checkValue'),
  reductionValue: document.getElementById('reductionValue'),
  polarValue: document.getElementById('polarValue'),
  spreadValue: document.getElementById('spreadValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  agentRange: document.getElementById('agentRange'),
  frameRange: document.getElementById('frameRange'),
  perceptionRange: document.getElementById('perceptionRange'),
  speedRange: document.getElementById('speedRange'),
  gridToggle: document.getElementById('gridToggle'),
  trailToggle: document.getElementById('trailToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  agentControlValue: document.getElementById('agentControlValue'),
  frameValue: document.getElementById('frameValue'),
  perceptionValue: document.getElementById('perceptionValue'),
  speedValue: document.getElementById('speedValue'),
};

const state = {
  seed: 19,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    count: numberValue(elements.agentRange),
    frames: numberValue(elements.frameRange),
    perception: numberValue(elements.perceptionRange) / 100,
    maxSpeed: numberValue(elements.speedRange) / 100,
    seed: state.seed,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.agentControlValue.textContent = String(settings.count);
  elements.frameValue.textContent = String(settings.frames);
  elements.perceptionValue.textContent = `${settings.perceptionRange || Math.round(settings.perception * 1000) / 10}%`;
  elements.speedValue.textContent = settings.maxSpeed.toFixed(2);
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
  state.summary = FlockCore.summarize(getSettings());
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
  gradient.addColorStop(0, '#07100d');
  gradient.addColorStop(0.54, '#0d1512');
  gradient.addColorStop(1, '#151813');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!elements.gridToggle.checked) return;

  context.save();
  context.strokeStyle = 'rgba(126, 255, 205, 0.08)';
  context.lineWidth = 1;
  const spacing = Math.max(34, canvas.width * getSettings().perception);

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

function drawHistory() {
  if (!state.summary || !elements.trailToggle.checked) return;

  const history = state.summary.history;
  const left = 24;
  const top = canvas.height - 128;
  const width = Math.min(380, canvas.width * 0.4);
  const height = 90;

  context.save();
  context.fillStyle = 'rgba(4, 10, 7, 0.74)';
  context.strokeStyle = 'rgba(126, 255, 205, 0.2)';
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  context.strokeStyle = '#7effcd';
  context.lineWidth = 2;
  context.beginPath();
  history.forEach((point, index) => {
    const x = left + index / Math.max(1, history.length - 1) * width;
    const y = top + height - point.polarization * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = '#b8c8c0';
  context.font = '800 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('polarization trace', left + 10, top + 18);
  context.restore();
}

function drawAgents() {
  if (!state.summary) return;

  context.save();
  state.summary.scene.agents.forEach((agent) => {
    const screen = toCanvas(agent);
    const angle = Math.atan2(agent.vy, agent.vx);
    const size = 6;

    context.translate(screen.x, screen.y);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(size + 2, 0);
    context.lineTo(-size, -size * 0.55);
    context.lineTo(-size * 0.55, 0);
    context.lineTo(-size, size * 0.55);
    context.closePath();
    context.fillStyle = '#7effcd';
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);
  });
  context.restore();
}

function draw() {
  drawBackground();
  drawAgents();
  drawHistory();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.agentValue.textContent = String(metrics.agents);
  elements.neighborValue.textContent = metrics.averageNeighbors.toFixed(1);
  elements.checkValue.textContent = `${(metrics.neighborChecks / 1000).toFixed(1)}K`;
  elements.reductionValue.textContent = `${Math.round(metrics.searchReduction * 100)}%`;
  elements.polarValue.textContent = metrics.polarization.toFixed(2);
  elements.spreadValue.textContent = metrics.centerSpread.toFixed(2);
  elements.agentBadge.textContent = `${metrics.agents} agents`;
  elements.statusValue.textContent = 'Simulated';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = FlockCore.benchmarkFlock({
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
    project: '019 - Spatial Hash Flocking',
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
  downloadBlob('spatial-hash-flocking.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'spatial-hash-flocking.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 019 - Spatial Hash Flocking',
    `Agents: ${metrics.agents || 0}`,
    `Average neighbors: ${metrics.averageNeighbors ? metrics.averageNeighbors.toFixed(2) : '0'}`,
    `Neighbor checks: ${metrics.neighborChecks || 0}`,
    `Search reduction: ${metrics.searchReduction ? `${(metrics.searchReduction * 100).toFixed(1)}%` : '0%'}`,
    `Polarization: ${metrics.polarization ? metrics.polarization.toFixed(3) : '0'}`,
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
    downloadBlob('spatial-hash-flocking-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', runSimulation);
  [elements.agentRange, elements.frameRange, elements.perceptionRange, elements.speedRange].forEach((element) => {
    element.addEventListener('input', runSimulation);
    element.addEventListener('change', runSimulation);
  });

  [elements.gridToggle, elements.trailToggle].forEach((element) => {
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
