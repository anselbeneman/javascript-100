const canvas = document.getElementById('synthCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  presetBadge: document.getElementById('presetBadge'),
  grainBadge: document.getElementById('grainBadge'),
  audioBadge: document.getElementById('audioBadge'),
  rmsValue: document.getElementById('rmsValue'),
  peakValue: document.getElementById('peakValue'),
  crestValue: document.getElementById('crestValue'),
  zcrValue: document.getElementById('zcrValue'),
  grainValue: document.getElementById('grainValue'),
  durationValue: document.getElementById('durationValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  frequencyRange: document.getElementById('frequencyRange'),
  densityRange: document.getElementById('densityRange'),
  grainRange: document.getElementById('grainRange'),
  spreadRange: document.getElementById('spreadRange'),
  textureRange: document.getElementById('textureRange'),
  durationRange: document.getElementById('durationRange'),
  renderButton: document.getElementById('renderButton'),
  playButton: document.getElementById('playButton'),
  stopButton: document.getElementById('stopButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  frequencyValue: document.getElementById('frequencyValue'),
  densityValue: document.getElementById('densityValue'),
  grainSizeValue: document.getElementById('grainSizeValue'),
  spreadValue: document.getElementById('spreadValue'),
  textureValue: document.getElementById('textureValue'),
  durationControlValue: document.getElementById('durationControlValue'),
};

const state = {
  seed: 12,
  summary: null,
  lastBenchmark: null,
  audioContext: null,
  sourceNode: null,
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    baseFrequency: numberValue(elements.frequencyRange),
    density: numberValue(elements.densityRange),
    grainMs: numberValue(elements.grainRange),
    spread: numberValue(elements.spreadRange) / 100,
    texture: numberValue(elements.textureRange) / 100,
    duration: numberValue(elements.durationRange) / 10,
    sampleRate: 44100,
    seed: state.seed,
  };
}

function applyPresetControls() {
  const preset = SynthCore.presetSettings(elements.presetSelect.value);
  elements.frequencyRange.value = String(Math.round(preset.baseFrequency));
  elements.densityRange.value = String(Math.round(preset.density));
  elements.grainRange.value = String(Math.round(preset.grainMs));
  elements.spreadRange.value = String(Math.round(preset.spread * 100));
  elements.textureRange.value = String(Math.round(preset.texture * 100));
}

function updateLabels() {
  const settings = getSettings();
  elements.presetBadge.textContent = SynthCore.presetLabel(settings.preset);
  elements.frequencyValue.textContent = `${Math.round(settings.baseFrequency)} Hz`;
  elements.densityValue.textContent = `${Math.round(settings.density)} / s`;
  elements.grainSizeValue.textContent = `${Math.round(settings.grainMs)} ms`;
  elements.spreadValue.textContent = `${Math.round(settings.spread * 100)}%`;
  elements.textureValue.textContent = `${Math.round(settings.texture * 100)}%`;
  elements.durationControlValue.textContent = `${settings.duration.toFixed(1)}s`;
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

function renderSummary() {
  updateLabels();
  state.summary = SynthCore.summarize(getSettings());
  updateMetrics();
  draw();
}

function drawGrid() {
  context.save();
  context.strokeStyle = 'rgba(238, 247, 244, 0.08)';
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

function drawWaveform() {
  if (!state.summary) return;

  const { left, right } = state.summary.buffer;
  const top = canvas.height * 0.12;
  const height = canvas.height * 0.34;
  const center = top + height * 0.5;
  const step = Math.max(1, Math.floor(left.length / canvas.width));

  context.save();
  context.strokeStyle = '#67e8f9';
  context.lineWidth = 1.8;
  context.beginPath();
  for (let x = 0; x < canvas.width; x += 1) {
    const index = Math.min(left.length - 1, x * step);
    const value = (left[index] + right[index]) * 0.5;
    const y = center - value * height * 0.42;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  context.strokeStyle = 'rgba(248, 220, 74, 0.34)';
  context.beginPath();
  context.moveTo(0, center);
  context.lineTo(canvas.width, center);
  context.stroke();
  context.restore();
}

function drawSpectrum() {
  if (!state.summary) return;

  const spectrum = state.summary.spectrum;
  const left = 26;
  const top = canvas.height * 0.58;
  const width = canvas.width - 52;
  const height = canvas.height * 0.30;
  const gap = 3;
  const barWidth = Math.max(3, width / spectrum.length - gap);

  context.save();
  spectrum.forEach((value, index) => {
    const x = left + index * (barWidth + gap);
    const barHeight = value * height;
    const hue = 188 + index / spectrum.length * 70;
    context.fillStyle = `hsla(${hue}, 88%, 64%, 0.82)`;
    context.fillRect(x, top + height - barHeight, barWidth, barHeight);
  });
  context.strokeStyle = 'rgba(238, 247, 244, 0.16)';
  context.strokeRect(left, top, width, height);
  context.restore();
}

function drawGrainMap() {
  if (!state.summary) return;

  const grains = state.summary.buffer.grains;
  const duration = state.summary.buffer.duration;
  const top = canvas.height * 0.49;
  const height = 34;

  context.save();
  grains.slice(0, 260).forEach((grain) => {
    const x = grain.start / duration * canvas.width;
    const y = top + (grain.pan + 1) * 0.5 * height;
    context.fillStyle = `rgba(248, 220, 74, ${0.20 + grain.gain})`;
    context.beginPath();
    context.arc(x, y, 2.2, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = '#9aaead';
  context.font = '700 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('grain schedule', 24, top - 8);
  context.restore();
}

function draw() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071018');
  gradient.addColorStop(0.55, '#0d141c');
  gradient.addColorStop(1, '#141521');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawWaveform();
  drawGrainMap();
  drawSpectrum();
}

function updateMetrics() {
  if (!state.summary) return;

  const analysis = state.summary.analysis;
  elements.rmsValue.textContent = analysis.rms.toFixed(3);
  elements.peakValue.textContent = analysis.peak.toFixed(3);
  elements.crestValue.textContent = analysis.crestFactor.toFixed(2);
  elements.zcrValue.textContent = analysis.zeroCrossingRate.toFixed(3);
  elements.grainValue.textContent = String(analysis.grainCount);
  elements.durationValue.textContent = `${analysis.duration.toFixed(1)}s`;
  elements.grainBadge.textContent = `${analysis.grainCount} grains`;
  elements.statusValue.textContent = 'Rendered';
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    elements.statusValue.textContent = 'Web Audio unavailable';
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  return state.audioContext;
}

function stopAudio() {
  if (state.sourceNode) {
    state.sourceNode.stop();
    state.sourceNode.disconnect();
    state.sourceNode = null;
  }
  elements.audioBadge.textContent = 'Offline';
}

function playAudio() {
  if (!state.summary) renderSummary();
  const audioContext = ensureAudioContext();
  if (!audioContext || !state.summary) return;

  stopAudio();
  const { left, right } = state.summary.buffer;
  const buffer = audioContext.createBuffer(2, left.length, state.summary.buffer.sampleRate);
  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
  source.onended = () => {
    if (state.sourceNode === source) {
      state.sourceNode = null;
      elements.audioBadge.textContent = 'Offline';
    }
  };
  state.sourceNode = source;
  elements.audioBadge.textContent = 'Playing';
  elements.statusValue.textContent = 'Playing';
}

function runBenchmark() {
  const settings = getSettings();
  const started = performance.now();
  let summary = null;
  const iterations = 12;

  for (let index = 0; index < iterations; index += 1) {
    summary = SynthCore.summarize({
      ...settings,
      seed: state.seed + index,
    });
  }

  const elapsed = performance.now() - started;
  state.lastBenchmark = {
    iterations,
    averageMs: elapsed / iterations,
    lastAnalysis: summary.analysis,
  };
  elements.benchmarkValue.textContent = `${state.lastBenchmark.averageMs.toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '012 - Granular Synth Lab',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    analysis: state.summary ? state.summary.analysis : null,
    spectrum: state.summary ? state.summary.spectrum.map((value) => Number(value.toFixed(5))) : [],
    benchmark: state.lastBenchmark,
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
    'granular-synth-lab.json',
    'application/json',
    `${JSON.stringify(exportMetadata(), null, 2)}\n`,
  );
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'granular-synth-lab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const analysis = metadata.analysis || {};
  return [
    '# 012 - Granular Synth Lab',
    `Preset: ${SynthCore.presetLabel(metadata.settings.preset)}`,
    `Grains: ${analysis.grainCount || 0}`,
    `RMS: ${analysis.rms ? analysis.rms.toFixed(4) : '0'}`,
    `Peak: ${analysis.peak ? analysis.peak.toFixed(4) : '0'}`,
    `Crest factor: ${analysis.crestFactor ? analysis.crestFactor.toFixed(2) : '0'}`,
    `Benchmark: ${metadata.benchmark ? `${metadata.benchmark.averageMs.toFixed(3)} ms/render` : 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('granular-synth-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', () => {
    applyPresetControls();
    renderSummary();
  });

  [
    elements.frequencyRange,
    elements.densityRange,
    elements.grainRange,
    elements.spreadRange,
    elements.textureRange,
    elements.durationRange,
  ].forEach((element) => {
    element.addEventListener('input', renderSummary);
    element.addEventListener('change', renderSummary);
  });

  elements.renderButton.addEventListener('click', renderSummary);
  elements.playButton.addEventListener('click', playAudio);
  elements.stopButton.addEventListener('click', stopAudio);
  elements.randomizeButton.addEventListener('click', () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    renderSummary();
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
applyPresetControls();
renderSummary();
