const canvas = document.getElementById('sdfCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  modeBadge: document.getElementById('modeBadge'),
  pixelBadge: document.getElementById('pixelBadge'),
  presetBadge: document.getElementById('presetBadge'),
  pixelValue: document.getElementById('pixelValue'),
  hitValue: document.getElementById('hitValue'),
  stepValue: document.getElementById('stepValue'),
  maxStepValue: document.getElementById('maxStepValue'),
  energyValue: document.getElementById('energyValue'),
  sizeValue: document.getElementById('sizeValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  widthRange: document.getElementById('widthRange'),
  heightRange: document.getElementById('heightRange'),
  stepRange: document.getElementById('stepRange'),
  timeRange: document.getElementById('timeRange'),
  renderButton: document.getElementById('renderButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  animateButton: document.getElementById('animateButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  widthValue: document.getElementById('widthValue'),
  heightValue: document.getElementById('heightValue'),
  stepControlValue: document.getElementById('stepControlValue'),
  timeValue: document.getElementById('timeValue'),
};

const state = {
  frame: null,
  benchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    width: numberValue(elements.widthRange),
    height: numberValue(elements.heightRange),
    maxSteps: numberValue(elements.stepRange),
    time: numberValue(elements.timeRange) / 100,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.widthValue.textContent = String(settings.width);
  elements.heightValue.textContent = String(settings.height);
  elements.stepControlValue.textContent = String(settings.maxSteps);
  elements.timeValue.textContent = settings.time.toFixed(2);
  elements.presetBadge.textContent = elements.presetSelect.options[elements.presetSelect.selectedIndex].textContent;
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

function renderFrame() {
  updateLabels();
  state.frame = SdfCore.render(getSettings());
  updateMetrics();
  draw();
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#090b12');
  gradient.addColorStop(0.55, '#11131e');
  gradient.addColorStop(1, '#18151e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFrame() {
  if (!state.frame) return;

  const scratch = document.createElement('canvas');
  scratch.width = state.frame.width;
  scratch.height = state.frame.height;
  const scratchContext = scratch.getContext('2d');
  scratchContext.putImageData(new ImageData(state.frame.pixels, state.frame.width, state.frame.height), 0, 0);

  const availableWidth = canvas.width - 36;
  const availableHeight = canvas.height - 36;
  const scale = Math.min(availableWidth / state.frame.width, availableHeight / state.frame.height);
  const width = state.frame.width * scale;
  const height = state.frame.height * scale;
  const left = (canvas.width - width) * 0.5;
  const top = (canvas.height - height) * 0.5;

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(scratch, left, top, width, height);
  context.strokeStyle = 'rgba(255, 222, 67, 0.32)';
  context.lineWidth = 1;
  context.strokeRect(left, top, width, height);
  context.restore();
}

function draw() {
  drawBackground();
  drawFrame();
}

function updateMetrics() {
  if (!state.frame) return;

  const metrics = state.frame.metrics;
  elements.pixelValue.textContent = String(metrics.pixelCount);
  elements.hitValue.textContent = `${Math.round(metrics.hitRatio * 100)}%`;
  elements.stepValue.textContent = metrics.averageSteps.toFixed(1);
  elements.maxStepValue.textContent = String(metrics.maxSteps);
  elements.energyValue.textContent = metrics.colorEnergy.toFixed(1);
  elements.sizeValue.textContent = `${state.frame.width} x ${state.frame.height}`;
  elements.pixelBadge.textContent = `${metrics.pixelCount} pixels`;
  elements.statusValue.textContent = 'Rendered';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = SdfCore.benchmarkRender({
    ...getSettings(),
    iterations: 5,
  });
  const elapsed = performance.now() - started;

  state.benchmark.averageMs = elapsed / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(1)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '021 - SDF Ray Marcher',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    metrics: state.frame ? state.frame.metrics : null,
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
  downloadBlob('sdf-ray-marcher.json', 'application/json', `${JSON.stringify(exportMetadata(), null, 2)}\n`);
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'sdf-ray-marcher.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 021 - SDF Ray Marcher',
    `Pixels: ${metrics.pixelCount || 0}`,
    `Hit ratio: ${metrics.hitRatio ? `${(metrics.hitRatio * 100).toFixed(1)}%` : '0%'}`,
    `Average steps: ${metrics.averageSteps ? metrics.averageSteps.toFixed(2) : '0'}`,
    `Maximum steps: ${metrics.maxSteps || 0}`,
    `Color energy: ${metrics.colorEnergy ? metrics.colorEnergy.toFixed(2) : '0'}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(2)} ms/render` : 'Not run'}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('sdf-ray-marcher-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  [elements.presetSelect, elements.widthRange, elements.heightRange, elements.stepRange, elements.timeRange].forEach((element) => {
    element.addEventListener('input', renderFrame);
    element.addEventListener('change', renderFrame);
  });

  elements.renderButton.addEventListener('click', renderFrame);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.animateButton.addEventListener('click', () => {
    elements.timeRange.value = String((numberValue(elements.timeRange) + 47) % 629);
    renderFrame();
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
renderFrame();
