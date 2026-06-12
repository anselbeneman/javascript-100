const canvas = document.getElementById('collisionCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  contactBadge: document.getElementById('contactBadge'),
  seedBadge: document.getElementById('seedBadge'),
  bodyValue: document.getElementById('bodyValue'),
  pairValue: document.getElementById('pairValue'),
  contactValue: document.getElementById('contactValue'),
  maxContactValue: document.getElementById('maxContactValue'),
  penetrationValue: document.getElementById('penetrationValue'),
  energyValue: document.getElementById('energyValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  bodyRange: document.getElementById('bodyRange'),
  frameRange: document.getElementById('frameRange'),
  restitutionRange: document.getElementById('restitutionRange'),
  normalToggle: document.getElementById('normalToggle'),
  boundsToggle: document.getElementById('boundsToggle'),
  velocityToggle: document.getElementById('velocityToggle'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  bodyControlValue: document.getElementById('bodyControlValue'),
  frameValue: document.getElementById('frameValue'),
  restitutionValue: document.getElementById('restitutionValue'),
};

const presets = {
  orbit: { count: 7, frames: 120, restitution: 0.64 },
  crowded: { count: 13, frames: 180, restitution: 0.55 },
  sparse: { count: 5, frames: 90, restitution: 0.72 },
  fast: { count: 9, frames: 220, restitution: 0.82 },
};

const state = {
  seed: 17,
  summary: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    count: numberValue(elements.bodyRange),
    frames: numberValue(elements.frameRange),
    restitution: numberValue(elements.restitutionRange) / 100,
    seed: state.seed,
  };
}

function applyPresetControls() {
  const preset = presets[elements.presetSelect.value];
  elements.bodyRange.value = String(preset.count);
  elements.frameRange.value = String(preset.frames);
  elements.restitutionRange.value = String(Math.round(preset.restitution * 100));
}

function updateLabels() {
  const settings = getSettings();
  elements.bodyControlValue.textContent = String(settings.count);
  elements.frameValue.textContent = String(settings.frames);
  elements.restitutionValue.textContent = `${Math.round(settings.restitution * 100)}%`;
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
  state.summary = CollisionCore.summarize(getSettings());
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
  gradient.addColorStop(0, '#07100f');
  gradient.addColorStop(0.56, '#0d1518');
  gradient.addColorStop(1, '#18151d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(120, 248, 211, 0.08)';
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

function drawBounds() {
  if (!elements.boundsToggle.checked || !state.summary) return;
  const bounds = state.summary.scene.bounds;
  const topLeft = toCanvas({ x: bounds.min, y: bounds.min });
  const bottomRight = toCanvas({ x: bounds.max, y: bounds.max });

  context.save();
  context.strokeStyle = 'rgba(255, 222, 67, 0.26)';
  context.lineWidth = 1.4;
  context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  context.restore();
}

function drawBody(body) {
  const vertices = CollisionCore.transformedVertices(body).map(toCanvas);

  context.save();
  context.beginPath();
  vertices.forEach((vertex, index) => {
    if (index === 0) context.moveTo(vertex.x, vertex.y);
    else context.lineTo(vertex.x, vertex.y);
  });
  context.closePath();
  context.fillStyle = `${body.color}88`;
  context.strokeStyle = body.color;
  context.lineWidth = 2;
  context.fill();
  context.stroke();

  if (elements.velocityToggle.checked) {
    const center = toCanvas(body.position);
    context.strokeStyle = '#f2f7ff';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(center.x + body.velocity.x * canvas.width * 0.7, center.y + body.velocity.y * canvas.height * 0.7);
    context.stroke();
  }
  context.restore();
}

function drawContacts() {
  if (!state.summary) return;

  context.save();
  state.summary.scene.contacts.forEach((contact) => {
    const screen = toCanvas(contact.contact);
    context.fillStyle = '#ffde43';
    context.beginPath();
    context.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
    context.fill();

    if (elements.normalToggle.checked) {
      context.strokeStyle = '#ffde43';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(screen.x, screen.y);
      context.lineTo(screen.x + contact.normal.x * 54, screen.y + contact.normal.y * 54);
      context.stroke();
    }
  });
  context.restore();
}

function draw() {
  drawBackground();
  if (!state.summary) return;
  drawBounds();
  state.summary.scene.bodies.forEach(drawBody);
  drawContacts();
}

function updateMetrics() {
  if (!state.summary) return;

  const metrics = state.summary.metrics;
  elements.bodyValue.textContent = String(metrics.bodies);
  elements.pairValue.textContent = String(metrics.pairCount);
  elements.contactValue.textContent = String(metrics.currentContacts);
  elements.maxContactValue.textContent = String(metrics.maxContacts);
  elements.penetrationValue.textContent = metrics.maxPenetration.toFixed(4);
  elements.energyValue.textContent = metrics.energy.toFixed(4);
  elements.contactBadge.textContent = `${metrics.currentContacts} contacts`;
  elements.statusValue.textContent = 'Simulated';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = CollisionCore.benchmarkCollision({
    ...getSettings(),
    iterations: 18,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '017 - SAT Collision Engine',
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
  downloadBlob('sat-collision-engine.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'sat-collision-engine.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 017 - SAT Collision Engine',
    `Bodies: ${metrics.bodies || 0}`,
    `Pairs tested: ${metrics.pairCount || 0}`,
    `Current contacts: ${metrics.currentContacts || 0}`,
    `Maximum contacts: ${metrics.maxContacts || 0}`,
    `Maximum penetration: ${metrics.maxPenetration ? metrics.maxPenetration.toFixed(5) : '0'}`,
    `Energy: ${metrics.energy ? metrics.energy.toFixed(5) : '0'}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(3)} ms/run` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('sat-collision-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', () => {
    applyPresetControls();
    runSimulation();
  });

  [elements.bodyRange, elements.frameRange, elements.restitutionRange].forEach((element) => {
    element.addEventListener('input', runSimulation);
    element.addEventListener('change', runSimulation);
  });

  [elements.normalToggle, elements.boundsToggle, elements.velocityToggle].forEach((element) => {
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
applyPresetControls();
runSimulation();
