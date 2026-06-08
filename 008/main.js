const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');

const elements = {
  sourceStatus: document.getElementById('sourceStatus'),
  audioStatus: document.getElementById('audioStatus'),
  peakMetric: document.getElementById('peakMetric'),
  rmsMetric: document.getElementById('rmsMetric'),
  beatMetric: document.getElementById('beatMetric'),
  fpsMetric: document.getElementById('fpsMetric'),
  binsMetric: document.getElementById('binsMetric'),
  viewStatus: document.getElementById('viewStatus'),
  energyMeter: document.getElementById('energyMeter'),
  startDemoButton: document.getElementById('startDemoButton'),
  stopButton: document.getElementById('stopButton'),
  audioFileInput: document.getElementById('audioFileInput'),
  modeSelect: document.getElementById('modeSelect'),
  paletteSelect: document.getElementById('paletteSelect'),
  fftSelect: document.getElementById('fftSelect'),
  smoothingInput: document.getElementById('smoothingInput'),
  smoothingValue: document.getElementById('smoothingValue'),
  sensitivityInput: document.getElementById('sensitivityInput'),
  sensitivityValue: document.getElementById('sensitivityValue'),
  volumeInput: document.getElementById('volumeInput'),
  volumeValue: document.getElementById('volumeValue'),
  freezeButton: document.getElementById('freezeButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  exportButton: document.getElementById('exportButton'),
};

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
const palettes = {
  signal: ['#06080d', '#23d3c3', '#ffb020', '#ff4d6d'],
  aurora: ['#071019', '#67f08e', '#45a3ff', '#e66cff'],
  thermal: ['#100807', '#ffd166', '#ef476f', '#06d6a0'],
};

const state = {
  audioContext: null,
  analyser: null,
  inputGain: null,
  outputGain: null,
  frequency: new Uint8Array(1024),
  waveform: new Uint8Array(2048),
  sources: [],
  timer: 0,
  sourceLabel: 'Idle',
  frozen: false,
  idlePhase: 0,
  peaks: [],
  history: [],
  lowHistory: [],
  frames: 0,
  fps: 0,
  fpsAt: performance.now(),
  metrics: { peak: 0, rms: 0, beat: 0 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function controls() {
  return {
    mode: elements.modeSelect.value,
    palette: palettes[elements.paletteSelect.value],
    fftSize: Number(elements.fftSelect.value),
    smoothing: Number(elements.smoothingInput.value),
    sensitivity: Number(elements.sensitivityInput.value),
    volume: Number(elements.volumeInput.value),
  };
}

function syncLabels() {
  elements.smoothingValue.value = Number(elements.smoothingInput.value).toFixed(2);
  elements.sensitivityValue.value = Number(elements.sensitivityInput.value).toFixed(2);
  elements.volumeValue.value = Number(elements.volumeInput.value).toFixed(2);
  elements.viewStatus.textContent = elements.modeSelect.options[elements.modeSelect.selectedIndex].textContent;
  if (state.analyser) state.analyser.smoothingTimeConstant = Number(elements.smoothingInput.value);
  if (state.outputGain && state.audioContext) {
    state.outputGain.gain.setTargetAtTime(Number(elements.volumeInput.value), state.audioContext.currentTime, 0.04);
  }
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(480, Math.floor(bounds.width * dpr));
  const height = Math.max(320, Math.floor(bounds.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    state.history = [];
  }
}

function ensureAudio() {
  if (!AudioContextCtor) {
    elements.audioStatus.textContent = 'Web Audio unavailable';
    return null;
  }
  if (!state.audioContext) {
    state.audioContext = new AudioContextCtor();
    state.inputGain = state.audioContext.createGain();
    state.outputGain = state.audioContext.createGain();
    state.analyser = state.audioContext.createAnalyser();
    state.inputGain.connect(state.analyser);
    state.analyser.connect(state.outputGain);
    state.outputGain.connect(state.audioContext.destination);
  }
  configureAnalyser();
  return state.audioContext;
}

function configureAnalyser() {
  if (!state.analyser) return;
  const next = controls();
  if (state.analyser.fftSize !== next.fftSize) {
    state.analyser.fftSize = next.fftSize;
    state.frequency = new Uint8Array(state.analyser.frequencyBinCount);
    state.waveform = new Uint8Array(state.analyser.fftSize);
    state.peaks = new Array(state.analyser.frequencyBinCount).fill(0);
    state.history = [];
  }
  state.analyser.smoothingTimeConstant = next.smoothing;
  state.outputGain.gain.setTargetAtTime(next.volume, state.audioContext.currentTime, 0.04);
  elements.binsMetric.textContent = `${state.analyser.frequencyBinCount} bins`;
}

function stopSource() {
  window.clearInterval(state.timer);
  state.timer = 0;
  state.sources.forEach((node) => {
    try { if (typeof node.stop === 'function') node.stop(); } catch (error) {}
    try { node.disconnect(); } catch (error) {}
  });
  state.sources = [];
  state.sourceLabel = 'Idle';
  elements.sourceStatus.textContent = 'Idle source';
  elements.audioStatus.textContent = state.audioContext ? 'Audio ready' : 'Audio locked';
}

function connect(node) {
  node.connect(state.inputGain);
  state.sources.push(node);
  return node;
}

async function startDemo() {
  const audio = ensureAudio();
  if (!audio) return;
  stopSource();
  await audio.resume();
  const master = audio.createGain();
  const bass = audio.createOscillator();
  const lead = audio.createOscillator();
  const pulse = audio.createOscillator();
  const bassGain = audio.createGain();
  const leadGain = audio.createGain();
  const pulseGain = audio.createGain();
  master.gain.value = 0.72;
  bassGain.gain.value = 0.34;
  leadGain.gain.value = 0.12;
  pulseGain.gain.value = 0.07;
  bass.type = 'sawtooth';
  lead.type = 'triangle';
  pulse.type = 'square';
  bass.connect(bassGain).connect(master);
  lead.connect(leadGain).connect(master);
  pulse.connect(pulseGain).connect(master);
  connect(master);
  [bass, lead, pulse].forEach((node) => {
    state.sources.push(node);
    node.start();
  });
  const notes = [82.41, 98, 110, 146.83, 123.47, 164.81, 130.81, 196];
  let step = 0;
  state.timer = window.setInterval(() => {
    const now = audio.currentTime;
    const note = notes[step % notes.length];
    bass.frequency.setTargetAtTime(note, now, 0.025);
    lead.frequency.setTargetAtTime(note * (step % 3 === 0 ? 4 : 3), now, 0.04);
    pulse.frequency.setTargetAtTime(note * 2, now, 0.035);
    step += 1;
  }, 240);
  state.sourceLabel = 'Demo';
  elements.sourceStatus.textContent = 'Demo synth';
  elements.audioStatus.textContent = 'Audio running';
}

async function startFile(file) {
  if (!file) return;
  const audio = ensureAudio();
  if (!audio) return;
  stopSource();
  elements.audioStatus.textContent = 'Decoding file';
  try {
    const buffer = await audio.decodeAudioData(await file.arrayBuffer());
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    connect(source);
    await audio.resume();
    source.start();
    state.sourceLabel = 'File';
    elements.sourceStatus.textContent = file.name;
    elements.audioStatus.textContent = 'Audio running';
  } catch (error) {
    elements.audioStatus.textContent = 'File decode failed';
  }
}

function fillIdle() {
  const c = controls();
  state.idlePhase += 0.026;
  for (let i = 0; i < state.frequency.length; i += 1) {
    const envelope = Math.exp(-i / (state.frequency.length * 0.46));
    const wave = Math.sin(i * 0.045 + state.idlePhase * 3) * 0.5 + 0.5;
    const ripple = Math.sin(i * 0.013 - state.idlePhase * 4.5) * 0.5 + 0.5;
    state.frequency[i] = Math.floor((22 + wave * 78 + ripple * 34) * envelope * c.sensitivity);
  }
  for (let i = 0; i < state.waveform.length; i += 1) {
    const value = Math.sin(i * 0.045 + state.idlePhase * 5) * 36 + Math.sin(i * 0.013 + state.idlePhase * 2) * 18;
    state.waveform[i] = clamp(Math.floor(128 + value), 0, 255);
  }
}

function readAudio() {
  configureAnalyser();
  if (!state.frozen && state.analyser && state.sourceLabel !== 'Idle') {
    state.analyser.getByteFrequencyData(state.frequency);
    state.analyser.getByteTimeDomainData(state.waveform);
  } else if (state.sourceLabel === 'Idle') {
    fillIdle();
  }
}

function analyze() {
  const c = controls();
  let max = 0;
  let maxIndex = 0;
  let total = 0;
  let low = 0;
  for (let i = 0; i < state.frequency.length; i += 1) {
    const value = clamp(state.frequency[i] * c.sensitivity, 0, 255);
    total += value;
    if (i < state.frequency.length * 0.18) low += value;
    if (value > max) {
      max = value;
      maxIndex = i;
    }
  }
  let waveEnergy = 0;
  for (let i = 0; i < state.waveform.length; i += 1) {
    const centered = (state.waveform[i] - 128) / 128;
    waveEnergy += centered * centered;
  }
  const lowAverage = low / Math.max(1, Math.floor(state.frequency.length * 0.18));
  state.lowHistory.push(lowAverage);
  if (state.lowHistory.length > 48) state.lowHistory.shift();
  const rolling = state.lowHistory.reduce((sum, value) => sum + value, 0) / state.lowHistory.length;
  const nyquist = state.audioContext ? state.audioContext.sampleRate / 2 : 24000;
  state.metrics.peak = Math.round((maxIndex / state.frequency.length) * nyquist);
  state.metrics.rms = Math.sqrt(waveEnergy / state.waveform.length);
  state.metrics.beat = clamp((lowAverage - rolling * 1.08) / 95, 0, 1);
  elements.energyMeter.style.transform = `scaleX(${clamp(total / state.frequency.length / 160, 0.04, 1)})`;
}

function background(palette) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(1, '#090d14');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  const gap = Math.max(36, Math.floor(canvas.width / 26));
  for (let x = 0; x <= canvas.width; x += gap) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gap) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

function drawSpectrum(c) {
  const bars = Math.min(128, Math.floor(canvas.width / 8));
  const baseline = canvas.height * 0.84;
  const maxHeight = canvas.height * 0.68;
  const gap = 2;
  const width = canvas.width / bars - gap;
  for (let bar = 0; bar < bars; bar += 1) {
    const start = Math.floor(((bar / bars) ** 1.7) * (state.frequency.length - 1));
    const end = Math.max(start + 1, Math.floor((((bar + 1) / bars) ** 1.7) * state.frequency.length));
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += state.frequency[i] || 0;
    const raw = clamp((sum / (end - start)) * c.sensitivity / 255, 0, 1);
    state.peaks[bar] = Math.max(raw, (state.peaks[bar] || 0) * 0.88);
    const h = Math.max(3, state.peaks[bar] * maxHeight);
    const x = bar * (width + gap);
    const y = baseline - h;
    const gradient = ctx.createLinearGradient(0, y, 0, baseline);
    gradient.addColorStop(0, c.palette[3]);
    gradient.addColorStop(0.5, c.palette[2]);
    gradient.addColorStop(1, c.palette[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, h);
  }
}

function drawWaveform(c) {
  ctx.lineWidth = Math.max(2, canvas.width * 0.003);
  ctx.strokeStyle = c.palette[1];
  ctx.beginPath();
  for (let i = 0; i < state.waveform.length; i += 1) {
    const x = (i / (state.waveform.length - 1)) * canvas.width;
    const y = canvas.height * 0.5 + ((state.waveform[i] - 128) / 128) * canvas.height * 0.36 * c.sensitivity;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawRadial(c) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.17;
  const spokes = 120;
  ctx.lineCap = 'round';
  for (let i = 0; i < spokes; i += 1) {
    const bin = Math.floor(((i / spokes) ** 1.5) * (state.frequency.length - 1));
    const value = clamp(state.frequency[bin] * c.sensitivity / 255, 0, 1);
    const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const length = radius + value * Math.min(canvas.width, canvas.height) * 0.31;
    ctx.strokeStyle = value > 0.55 ? c.palette[2] : c.palette[1];
    ctx.lineWidth = Math.max(2, value * 7);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.stroke();
  }
}

function mix(start, end, amount) {
  const a = parseInt(start.slice(1), 16);
  const b = parseInt(end.slice(1), 16);
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  const br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  return `rgb(${Math.round(ar + (br - ar) * amount)},${Math.round(ag + (bg - ag) * amount)},${Math.round(ab + (bb - ab) * amount)})`;
}

function drawSpectrogram(c) {
  if (!state.frozen) {
    const row = new Uint8Array(96);
    for (let i = 0; i < row.length; i += 1) {
      const index = Math.floor(((i / row.length) ** 1.5) * (state.frequency.length - 1));
      row[i] = clamp(Math.floor(state.frequency[index] * c.sensitivity), 0, 255);
    }
    state.history.push(row);
  }
  const maxRows = Math.max(120, Math.floor(canvas.width / 4));
  while (state.history.length > maxRows) state.history.shift();
  const columnWidth = canvas.width / maxRows;
  const rowHeight = canvas.height / 96;
  const offset = maxRows - state.history.length;
  state.history.forEach((row, xIndex) => {
    row.forEach((value, band) => {
      const intensity = value / 255;
      ctx.fillStyle = intensity < 0.5 ? mix(c.palette[0], c.palette[1], intensity * 2) : mix(c.palette[1], c.palette[2], (intensity - 0.5) * 2);
      ctx.fillRect((offset + xIndex) * columnWidth, canvas.height - (band + 1) * rowHeight, columnWidth + 1, rowHeight + 1);
    });
  });
}

function updateMetrics() {
  elements.peakMetric.textContent = `${state.metrics.peak || '--'} Hz`;
  elements.rmsMetric.textContent = `${Math.round(state.metrics.rms * 100)}%`;
  elements.beatMetric.textContent = state.metrics.beat.toFixed(2);
  elements.fpsMetric.textContent = String(state.fps);
}

function frame(now) {
  resizeCanvas();
  readAudio();
  analyze();
  const c = controls();
  background(c.palette);
  if (c.mode === 'waveform') drawWaveform(c);
  else if (c.mode === 'spectrogram') drawSpectrogram(c);
  else if (c.mode === 'radial') drawRadial(c);
  else drawSpectrum(c);
  state.frames += 1;
  if (now - state.fpsAt > 500) {
    state.fps = Math.round((state.frames * 1000) / (now - state.fpsAt));
    state.frames = 0;
    state.fpsAt = now;
    updateMetrics();
  }
  requestAnimationFrame(frame);
}

function randomize() {
  const modes = ['spectrum', 'radial', 'waveform', 'spectrogram'];
  const paletteNames = Object.keys(palettes);
  elements.modeSelect.value = modes[Math.floor(Math.random() * modes.length)];
  elements.paletteSelect.value = paletteNames[Math.floor(Math.random() * paletteNames.length)];
  elements.sensitivityInput.value = (0.9 + Math.random() * 1.0).toFixed(2);
  state.history = [];
  syncLabels();
}

function exportPng() {
  const link = document.createElement('a');
  link.download = '008-audio-spectrum-visualizer.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

elements.startDemoButton.addEventListener('click', startDemo);
elements.stopButton.addEventListener('click', stopSource);
elements.audioFileInput.addEventListener('change', () => startFile(elements.audioFileInput.files[0]));
elements.freezeButton.addEventListener('click', () => {
  state.frozen = !state.frozen;
  elements.freezeButton.textContent = state.frozen ? 'Resume' : 'Freeze';
});
elements.randomizeButton.addEventListener('click', randomize);
elements.exportButton.addEventListener('click', exportPng);
[elements.modeSelect, elements.paletteSelect, elements.fftSelect].forEach((input) => {
  input.addEventListener('change', () => {
    state.history = [];
    syncLabels();
    configureAnalyser();
  });
});
[elements.smoothingInput, elements.sensitivityInput, elements.volumeInput].forEach((input) => {
  input.addEventListener('input', syncLabels);
});
window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', stopSource);

syncLabels();
resizeCanvas();
fillIdle();
updateMetrics();
requestAnimationFrame(frame);
