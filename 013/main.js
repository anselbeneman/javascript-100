const canvas = document.getElementById('meshCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  pointsBadge: document.getElementById('pointsBadge'),
  seedBadge: document.getElementById('seedBadge'),
  pointValue: document.getElementById('pointValue'),
  triangleValue: document.getElementById('triangleValue'),
  edgeValue: document.getElementById('edgeValue'),
  angleValue: document.getElementById('angleValue'),
  coverageValue: document.getElementById('coverageValue'),
  eulerValue: document.getElementById('eulerValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  pointRange: document.getElementById('pointRange'),
  spreadRange: document.getElementById('spreadRange'),
  jitterRange: document.getElementById('jitterRange'),
  triangleToggle: document.getElementById('triangleToggle'),
  circleToggle: document.getElementById('circleToggle'),
  pointToggle: document.getElementById('pointToggle'),
  generateButton: document.getElementById('generateButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  pointControlValue: document.getElementById('pointControlValue'),
  spreadValue: document.getElementById('spreadValue'),
  jitterValue: document.getElementById('jitterValue'),
};

const presets = {
  balanced: { count: 54, spread: 0.84, jitter: 0.24 },
  dense: { count: 118, spread: 0.92, jitter: 0.18 },
  sparse: { count: 28, spread: 0.78, jitter: 0.12 },
  jagged: { count: 82, spread: 0.98, jitter: 0.58 },
};

const state = {
  seed: 13,
  mesh: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    count: numberValue(elements.pointRange),
    spread: numberValue(elements.spreadRange) / 100,
    jitter: numberValue(elements.jitterRange) / 100,
    seed: state.seed,
  };
}

function applyPresetControls() {
  const preset = presets[elements.presetSelect.value];
  elements.pointRange.value = String(preset.count);
  elements.spreadRange.value = String(Math.round(preset.spread * 100));
  elements.jitterRange.value = String(Math.round(preset.jitter * 100));
}

function updateLabels() {
  const settings = getSettings();
  elements.pointControlValue.textContent = String(settings.count);
  elements.spreadValue.textContent = `${Math.round(settings.spread * 100)}%`;
  elements.jitterValue.textContent = `${Math.round(settings.jitter * 100)}%`;
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

function generateMesh() {
  updateLabels();
  state.mesh = MeshCore.createMesh(getSettings());
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
  gradient.addColorStop(0, '#061018');
  gradient.addColorStop(0.55, '#081319');
  gradient.addColorStop(1, '#11151f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = 'rgba(137, 245, 227, 0.08)';
  context.lineWidth = 1;
  const spacing = 54;

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

function drawTriangles() {
  if (!state.mesh || !elements.triangleToggle.checked) return;

  const { points, triangles } = state.mesh;
  context.save();
  triangles.forEach((triangle, index) => {
    const a = toCanvas(points[triangle.a]);
    const b = toCanvas(points[triangle.b]);
    const c = toCanvas(points[triangle.c]);
    const alpha = 0.12 + (index % 7) * 0.018;

    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.closePath();
    context.fillStyle = `rgba(137, 245, 227, ${alpha})`;
    context.fill();
    context.strokeStyle = 'rgba(137, 245, 227, 0.38)';
    context.lineWidth = 1;
    context.stroke();
  });
  context.restore();
}

function drawCircumcircles() {
  if (!state.mesh || !elements.circleToggle.checked) return;

  const { points, triangles } = state.mesh;
  context.save();
  context.strokeStyle = 'rgba(255, 222, 67, 0.24)';
  context.lineWidth = 1;

  triangles.slice(0, 64).forEach((triangle) => {
    const circle = MeshCore.circumcircle(points[triangle.a], points[triangle.b], points[triangle.c]);
    if (!Number.isFinite(circle.radiusSquared)) return;

    context.beginPath();
    context.arc(circle.x * canvas.width, circle.y * canvas.height, Math.sqrt(circle.radiusSquared) * canvas.width, 0, Math.PI * 2);
    context.stroke();
  });
  context.restore();
}

function drawPoints() {
  if (!state.mesh || !elements.pointToggle.checked) return;

  context.save();
  state.mesh.points.forEach((point) => {
    const screen = toCanvas(point);
    context.beginPath();
    context.arc(screen.x, screen.y, 4.4, 0, Math.PI * 2);
    context.fillStyle = '#ffde43';
    context.fill();
    context.strokeStyle = '#061018';
    context.lineWidth = 2;
    context.stroke();
  });
  context.restore();
}

function drawHullFrame() {
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.strokeRect(canvas.width * 0.035, canvas.height * 0.035, canvas.width * 0.93, canvas.height * 0.93);
  context.restore();
}

function draw() {
  drawBackground();
  drawTriangles();
  drawCircumcircles();
  drawHullFrame();
  drawPoints();
}

function updateMetrics() {
  if (!state.mesh) return;

  const stats = state.mesh.stats;
  elements.pointValue.textContent = String(stats.pointCount);
  elements.triangleValue.textContent = String(stats.triangleCount);
  elements.edgeValue.textContent = String(stats.edgeCount);
  elements.angleValue.textContent = `${stats.minAngle.toFixed(1)} deg`;
  elements.coverageValue.textContent = stats.coverageArea.toFixed(3);
  elements.eulerValue.textContent = String(stats.eulerResidual);
  elements.pointsBadge.textContent = `${stats.pointCount} points`;
  elements.statusValue.textContent = 'Triangulated';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = MeshCore.benchmarkMesh({
    ...getSettings(),
    iterations: 36,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '013 - Delaunay Mesh Lab',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    stats: state.mesh ? state.mesh.stats : null,
    triangles: state.mesh ? state.mesh.triangles.length : 0,
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
  downloadBlob('delaunay-mesh-lab.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'delaunay-mesh-lab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const stats = metadata.stats || {};
  return [
    '# 013 - Delaunay Mesh Lab',
    `Points: ${stats.pointCount || 0}`,
    `Triangles: ${stats.triangleCount || 0}`,
    `Edges: ${stats.edgeCount || 0}`,
    `Minimum angle: ${stats.minAngle ? stats.minAngle.toFixed(2) : '0'} deg`,
    `Coverage area: ${stats.coverageArea ? stats.coverageArea.toFixed(4) : '0'}`,
    `Euler residual: ${stats.eulerResidual || 0}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(3)} ms/mesh` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('delaunay-mesh-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', () => {
    applyPresetControls();
    generateMesh();
  });

  [elements.pointRange, elements.spreadRange, elements.jitterRange].forEach((element) => {
    element.addEventListener('input', generateMesh);
    element.addEventListener('change', generateMesh);
  });

  [elements.triangleToggle, elements.circleToggle, elements.pointToggle].forEach((element) => {
    element.addEventListener('change', draw);
  });

  elements.generateButton.addEventListener('click', generateMesh);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1103515245 + 12345) >>> 0;
    generateMesh();
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
generateMesh();
