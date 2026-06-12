const canvas = document.getElementById('neuralCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  datasetBadge: document.getElementById('datasetBadge'),
  modeBadge: document.getElementById('modeBadge'),
  seedBadge: document.getElementById('seedBadge'),
  fpsValue: document.getElementById('fpsValue'),
  lossValue: document.getElementById('lossValue'),
  accuracyValue: document.getElementById('accuracyValue'),
  epochValue: document.getElementById('epochValue'),
  hiddenMetricValue: document.getElementById('hiddenMetricValue'),
  samplesValue: document.getElementById('samplesValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  datasetSelect: document.getElementById('datasetSelect'),
  sampleRange: document.getElementById('sampleRange'),
  noiseRange: document.getElementById('noiseRange'),
  hiddenRange: document.getElementById('hiddenRange'),
  learningRateRange: document.getElementById('learningRateRange'),
  regularizationRange: document.getElementById('regularizationRange'),
  stepsRange: document.getElementById('stepsRange'),
  trainButton: document.getElementById('trainButton'),
  stepButton: document.getElementById('stepButton'),
  resetButton: document.getElementById('resetButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  boundaryToggle: document.getElementById('boundaryToggle'),
  curveToggle: document.getElementById('curveToggle'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  sampleValue: document.getElementById('sampleValue'),
  noiseValue: document.getElementById('noiseValue'),
  hiddenControlValue: document.getElementById('hiddenControlValue'),
  rateValue: document.getElementById('rateValue'),
  regularizationValue: document.getElementById('regularizationValue'),
  stepsValue: document.getElementById('stepsValue'),
};

const state = {
  dataset: null,
  network: null,
  metrics: { loss: 0, accuracy: 0, confusion: {} },
  history: [],
  epoch: 0,
  running: true,
  seed: 10,
  fps: 0,
  lastTime: performance.now(),
  lastBenchmark: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.datasetSelect.value,
    sampleCount: numberValue(elements.sampleRange),
    noise: numberValue(elements.noiseRange) / 100,
    hiddenUnits: numberValue(elements.hiddenRange),
    learningRate: numberValue(elements.learningRateRange) / 100,
    regularization: numberValue(elements.regularizationRange) / 10000,
    stepsPerFrame: numberValue(elements.stepsRange),
  };
}

function updateControlLabels() {
  const settings = getSettings();
  elements.datasetBadge.textContent = NeuralCore.datasetLabel(settings.preset);
  elements.modeBadge.textContent = state.running ? 'Training' : 'Paused';
  elements.seedBadge.textContent = `Seed ${state.seed}`;
  elements.sampleValue.textContent = String(settings.sampleCount);
  elements.noiseValue.textContent = `${Math.round(settings.noise * 100)}%`;
  elements.hiddenControlValue.textContent = String(settings.hiddenUnits);
  elements.rateValue.textContent = settings.learningRate.toFixed(2);
  elements.regularizationValue.textContent = settings.regularization.toFixed(3);
  elements.stepsValue.textContent = String(settings.stepsPerFrame);
  elements.trainButton.textContent = state.running ? 'Pause' : 'Resume';
}

function resetExperiment() {
  const settings = getSettings();
  state.dataset = NeuralCore.createDataset({
    preset: settings.preset,
    count: settings.sampleCount,
    noise: settings.noise,
    seed: state.seed,
  });
  state.network = NeuralCore.createNetwork({
    hiddenUnits: settings.hiddenUnits,
    seed: state.seed + 1009,
  });
  state.metrics = NeuralCore.evaluate(state.network, state.dataset.samples);
  state.history = [state.metrics.loss];
  state.epoch = 0;
  state.lastBenchmark = null;
  elements.benchmarkValue.textContent = 'Not run';
  updateControlLabels();
  updateMetrics();
  draw();
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

function trainEpochs(count) {
  const settings = getSettings();

  for (let index = 0; index < count; index += 1) {
    NeuralCore.trainEpoch(state.network, state.dataset.samples, {
      learningRate: settings.learningRate,
      regularization: settings.regularization,
    });
    state.epoch += 1;

    if (state.epoch % 2 === 0) {
      state.metrics = NeuralCore.evaluate(state.network, state.dataset.samples);
      state.history.push(state.metrics.loss);
      if (state.history.length > 180) {
        state.history.shift();
      }
    }
  }

  state.metrics = NeuralCore.evaluate(state.network, state.dataset.samples);
  if (state.history[state.history.length - 1] !== state.metrics.loss) {
    state.history.push(state.metrics.loss);
  }
}

function worldToCanvas(point) {
  return {
    x: (point.x + 1) * 0.5 * canvas.width,
    y: (1 - (point.y + 1) * 0.5) * canvas.height,
  };
}

function canvasToWorld(x, y) {
  return {
    x: x / canvas.width * 2 - 1,
    y: (1 - y / canvas.height) * 2 - 1,
  };
}

function drawDecisionBoundary() {
  if (!elements.boundaryToggle.checked || !state.network) return;

  const cell = Math.max(8, Math.floor(canvas.width / 110));

  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      const point = canvasToWorld(x + cell * 0.5, y + cell * 0.5);
      const probability = NeuralCore.forward(state.network, point).output;
      const alpha = 0.16 + Math.abs(probability - 0.5) * 0.42;

      if (probability >= 0.5) {
        context.fillStyle = `rgba(103, 232, 249, ${alpha})`;
      } else {
        context.fillStyle = `rgba(255, 126, 144, ${alpha})`;
      }

      context.fillRect(x, y, cell + 1, cell + 1);
    }
  }
}

function drawAxes() {
  context.save();
  context.strokeStyle = 'rgba(238, 247, 244, 0.18)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(canvas.width * 0.5, 0);
  context.lineTo(canvas.width * 0.5, canvas.height);
  context.moveTo(0, canvas.height * 0.5);
  context.lineTo(canvas.width, canvas.height * 0.5);
  context.stroke();

  context.strokeStyle = 'rgba(238, 247, 244, 0.07)';
  for (let offset = 0.25; offset < 1; offset += 0.25) {
    context.beginPath();
    context.moveTo(canvas.width * offset, 0);
    context.lineTo(canvas.width * offset, canvas.height);
    context.moveTo(0, canvas.height * offset);
    context.lineTo(canvas.width, canvas.height * offset);
    context.stroke();
  }
  context.restore();
}

function drawSamples() {
  const samples = state.dataset.samples;

  samples.forEach((sample) => {
    const point = worldToCanvas(sample);
    const prediction = NeuralCore.forward(state.network, sample).output >= 0.5 ? 1 : 0;
    const correct = prediction === sample.label;

    context.fillStyle = sample.label === 1 ? '#67e8f9' : '#ff7e90';
    context.strokeStyle = correct ? 'rgba(4, 9, 13, 0.82)' : '#f8dc4a';
    context.lineWidth = correct ? 1.5 : 3;
    context.beginPath();
    context.arc(point.x, point.y, correct ? 4.5 : 6, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });
}

function drawNetworkGlyph() {
  const leftX = canvas.width - 190;
  const topY = 38;
  const hiddenCount = Math.min(8, state.network.hiddenUnits);
  const hiddenYStart = topY + 12;
  const hiddenSpacing = 22;

  context.save();
  context.globalAlpha = 0.86;
  context.strokeStyle = 'rgba(238, 247, 244, 0.18)';
  context.fillStyle = 'rgba(8, 14, 18, 0.72)';
  context.fillRect(leftX - 18, topY - 18, 170, 214);
  context.strokeRect(leftX - 18, topY - 18, 170, 214);

  const inputs = [
    { x: leftX, y: topY + 50 },
    { x: leftX, y: topY + 118 },
  ];
  const hidden = Array.from({ length: hiddenCount }, (_, index) => ({
    x: leftX + 70,
    y: hiddenYStart + index * hiddenSpacing,
  }));
  const output = { x: leftX + 135, y: topY + 84 };

  context.lineWidth = 1;
  inputs.forEach((input) => {
    hidden.forEach((node) => {
      context.beginPath();
      context.moveTo(input.x, input.y);
      context.lineTo(node.x, node.y);
      context.stroke();
    });
  });
  hidden.forEach((node) => {
    context.beginPath();
    context.moveTo(node.x, node.y);
    context.lineTo(output.x, output.y);
    context.stroke();
  });

  [...inputs, ...hidden, output].forEach((node, index) => {
    context.fillStyle = index < 2 ? '#f8dc4a' : index === inputs.length + hidden.length ? '#ffffff' : '#67e8f9';
    context.beginPath();
    context.arc(node.x, node.y, 6, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawLossCurve() {
  if (!elements.curveToggle.checked || state.history.length < 2) return;

  const width = 250;
  const height = 92;
  const left = 24;
  const top = canvas.height - height - 24;
  const maxLoss = Math.max(...state.history, 0.7);
  const minLoss = Math.min(...state.history, 0);

  context.save();
  context.fillStyle = 'rgba(6, 11, 15, 0.78)';
  context.strokeStyle = 'rgba(103, 232, 249, 0.22)';
  context.lineWidth = 1;
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);

  context.strokeStyle = '#f8dc4a';
  context.lineWidth = 2;
  context.beginPath();
  state.history.forEach((loss, index) => {
    const x = left + index / (state.history.length - 1) * width;
    const normalized = (loss - minLoss) / Math.max(0.0001, maxLoss - minLoss);
    const y = top + height - normalized * (height - 14) - 7;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  context.fillStyle = '#eff7f4';
  context.font = '700 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('loss', left + 10, top + 18);
  context.restore();
}

function draw() {
  if (!state.dataset || !state.network) return;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071016');
  gradient.addColorStop(0.55, '#0d141b');
  gradient.addColorStop(1, '#12141f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawDecisionBoundary();
  drawAxes();
  drawSamples();
  drawNetworkGlyph();
  drawLossCurve();
}

function updateMetrics() {
  if (!state.dataset || !state.network) return;

  elements.fpsValue.textContent = `${Math.round(state.fps)}`;
  elements.lossValue.textContent = state.metrics.loss.toFixed(3);
  elements.accuracyValue.textContent = `${Math.round(state.metrics.accuracy * 100)}%`;
  elements.epochValue.textContent = String(state.epoch);
  elements.hiddenMetricValue.textContent = String(state.network.hiddenUnits);
  elements.samplesValue.textContent = String(state.dataset.samples.length);
  elements.statusValue.textContent = state.running ? 'Training' : 'Paused';
  updateControlLabels();
}

function runBenchmark() {
  const settings = getSettings();
  const dataset = NeuralCore.createDataset({
    preset: settings.preset,
    count: settings.sampleCount,
    noise: settings.noise,
    seed: state.seed + 77,
  });
  const network = NeuralCore.createNetwork({
    hiddenUnits: settings.hiddenUnits,
    seed: state.seed + 177,
  });
  const started = performance.now();
  const before = NeuralCore.evaluate(network, dataset.samples);
  const epochs = 160;
  const after = NeuralCore.trainNetwork(network, dataset.samples, {
    epochs,
    learningRate: settings.learningRate,
    regularization: settings.regularization,
  });
  const elapsed = performance.now() - started;

  state.lastBenchmark = {
    epochs,
    averageEpochMs: elapsed / epochs,
    before,
    after,
  };
  elements.benchmarkValue.textContent = `${(elapsed / epochs).toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '010 - Neural Network Playground',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    epoch: state.epoch,
    metrics: {
      loss: Number(state.metrics.loss.toFixed(6)),
      accuracy: Number(state.metrics.accuracy.toFixed(4)),
      benchmark: state.lastBenchmark,
    },
    dataset: {
      preset: state.dataset.preset,
      count: state.dataset.samples.length,
      noise: state.dataset.noise,
    },
    network: NeuralCore.serializeNetwork(state.network),
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
  downloadBlob(
    'neural-network-playground.json',
    'application/json',
    `${JSON.stringify(exportMetadata(), null, 2)}\n`,
  );
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'neural-network-playground.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  return [
    '# 010 - Neural Network Playground',
    `Dataset: ${NeuralCore.datasetLabel(metadata.settings.preset)}`,
    `Samples: ${metadata.dataset.count}`,
    `Hidden units: ${metadata.network.hiddenUnits}`,
    `Epoch: ${metadata.epoch}`,
    `Loss: ${metadata.metrics.loss}`,
    `Accuracy: ${Math.round(metadata.metrics.accuracy * 100)}%`,
    `Benchmark: ${metadata.metrics.benchmark ? `${metadata.metrics.benchmark.averageEpochMs.toFixed(3)} ms/epoch` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('neural-network-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function frameLoop(now) {
  const deltaSeconds = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
  state.lastTime = now;
  state.fps = state.fps === 0
    ? 1 / deltaSeconds
    : state.fps * 0.9 + (1 / deltaSeconds) * 0.1;

  if (state.running) {
    trainEpochs(getSettings().stepsPerFrame);
  }

  draw();
  updateMetrics();
  requestAnimationFrame(frameLoop);
}

function attachEvents() {
  [
    elements.datasetSelect,
    elements.sampleRange,
    elements.noiseRange,
    elements.hiddenRange,
  ].forEach((element) => {
    element.addEventListener('input', resetExperiment);
    element.addEventListener('change', resetExperiment);
  });

  [
    elements.learningRateRange,
    elements.regularizationRange,
    elements.stepsRange,
    elements.boundaryToggle,
    elements.curveToggle,
  ].forEach((element) => {
    element.addEventListener('input', () => {
      updateControlLabels();
      draw();
    });
    element.addEventListener('change', () => {
      updateControlLabels();
      draw();
    });
  });

  elements.trainButton.addEventListener('click', () => {
    state.running = !state.running;
    updateMetrics();
  });

  elements.stepButton.addEventListener('click', () => {
    trainEpochs(1);
    draw();
    updateMetrics();
  });

  elements.resetButton.addEventListener('click', resetExperiment);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    resetExperiment();
  });
  elements.benchmarkButton.addEventListener('click', runBenchmark);
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
resetExperiment();
requestAnimationFrame(frameLoop);
