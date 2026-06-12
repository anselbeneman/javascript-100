const canvas = document.getElementById('vmCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  presetBadge: document.getElementById('presetBadge'),
  phaseBadge: document.getElementById('phaseBadge'),
  runtimeBadge: document.getElementById('runtimeBadge'),
  tokensValue: document.getElementById('tokensValue'),
  bytecodeValue: document.getElementById('bytecodeValue'),
  samplesMetricValue: document.getElementById('samplesMetricValue'),
  plotsValue: document.getElementById('plotsValue'),
  stepsValue: document.getElementById('stepsValue'),
  stackValue: document.getElementById('stackValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  sourceEditor: document.getElementById('sourceEditor'),
  runButton: document.getElementById('runButton'),
  animateButton: document.getElementById('animateButton'),
  resetButton: document.getElementById('resetButton'),
  samplesRange: document.getElementById('samplesRange'),
  speedRange: document.getElementById('speedRange'),
  traceToggle: document.getElementById('traceToggle'),
  bytecodeToggle: document.getElementById('bytecodeToggle'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  formatButton: document.getElementById('formatButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  samplesValue: document.getElementById('samplesValue'),
  speedValue: document.getElementById('speedValue'),
};

const presetLabels = {
  rose: 'Parametric Rose',
  lissajous: 'Lissajous Curve',
  orbit: 'Orbital Flower',
  signal: 'Signal Modulation',
};

const state = {
  running: true,
  phase: 0,
  compiled: null,
  output: null,
  lastError: null,
  lastBenchmark: null,
  lastTime: performance.now(),
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    samples: numberValue(elements.samplesRange),
    speed: numberValue(elements.speedRange) / 100,
  };
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

function updateLabels() {
  const settings = getSettings();
  elements.presetBadge.textContent = presetLabels[settings.preset] || settings.preset;
  elements.phaseBadge.textContent = `Phase ${state.phase.toFixed(2)}`;
  elements.samplesValue.textContent = String(settings.samples);
  elements.speedValue.textContent = settings.speed.toFixed(2);
  elements.animateButton.textContent = state.running ? 'Pause' : 'Resume';
}

function compileAndRun() {
  try {
    const settings = getSettings();
    const source = elements.sourceEditor.value;
    const tokens = CompilerCore.tokenize(source);
    const program = CompilerCore.compile(source);
    const output = CompilerCore.executeBytecode(program, {
      samples: settings.samples,
      phase: state.phase,
    });

    state.compiled = { tokens, program };
    state.output = output;
    state.lastError = null;
    elements.statusValue.textContent = 'Running';
  } catch (error) {
    state.lastError = error;
    elements.statusValue.textContent = 'Compile error';
  }

  updateMetrics();
  draw();
}

function loadPresetSource() {
  elements.sourceEditor.value = CompilerCore.presetSource(elements.presetSelect.value);
  state.phase = 0;
  compileAndRun();
}

function worldToCanvas(point) {
  const scale = Math.min(canvas.width, canvas.height) * 0.38;
  return {
    x: canvas.width * 0.44 + point.x * scale,
    y: canvas.height * 0.52 - point.y * scale,
  };
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

  context.strokeStyle = 'rgba(248, 220, 74, 0.22)';
  context.beginPath();
  context.moveTo(canvas.width * 0.44, 0);
  context.lineTo(canvas.width * 0.44, canvas.height);
  context.moveTo(0, canvas.height * 0.52);
  context.lineTo(canvas.width, canvas.height * 0.52);
  context.stroke();
  context.restore();
}

function drawPlots() {
  if (!state.output || state.output.plots.length === 0) return;

  context.save();
  context.lineWidth = 2;
  context.lineJoin = 'round';
  context.lineCap = 'round';

  state.output.plots.forEach((plot, index) => {
    const point = worldToCanvas(plot);
    const hue = 184 + plot.t * 100;
    context.fillStyle = `hsla(${hue}, 88%, 66%, 0.82)`;

    if (index > 0) {
      const previous = worldToCanvas(state.output.plots[index - 1]);
      context.strokeStyle = `hsla(${hue}, 88%, 62%, 0.46)`;
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }

    if (index % Math.max(1, Math.floor(state.output.plots.length / 120)) === 0) {
      context.beginPath();
      context.arc(point.x, point.y, 2.8, 0, Math.PI * 2);
      context.fill();
    }
  });

  context.restore();
}

function drawBytecode() {
  if (!elements.bytecodeToggle.checked || !state.compiled) return;

  const bytecode = state.compiled.program.bytecode.slice(0, 15);
  const left = canvas.width - 290;
  const top = 24;
  const rowHeight = 22;

  context.save();
  context.fillStyle = 'rgba(6, 11, 16, 0.78)';
  context.strokeStyle = 'rgba(103, 232, 249, 0.24)';
  context.fillRect(left, top, 266, 42 + bytecode.length * rowHeight);
  context.strokeRect(left, top, 266, 42 + bytecode.length * rowHeight);
  context.fillStyle = '#eff7f4';
  context.font = '800 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('BYTECODE', left + 12, top + 20);
  context.font = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace';

  bytecode.forEach((instruction, index) => {
    const label = `${String(index).padStart(2, '0')} ${instruction.op} ${instruction.arg === null || instruction.arg === undefined ? '' : JSON.stringify(instruction.arg)}`;
    context.fillStyle = index % 2 === 0 ? '#9eeaf2' : '#f8dc4a';
    context.fillText(label.slice(0, 36), left + 12, top + 44 + index * rowHeight);
  });
  context.restore();
}

function drawTrace() {
  if (!elements.traceToggle.checked || !state.output) return;

  const trace = state.output.trace.slice(0, 14);
  const left = 24;
  const top = 24;

  context.save();
  context.fillStyle = 'rgba(6, 11, 16, 0.70)';
  context.strokeStyle = 'rgba(248, 220, 74, 0.22)';
  context.fillRect(left, top, 210, 42 + trace.length * 20);
  context.strokeRect(left, top, 210, 42 + trace.length * 20);
  context.fillStyle = '#eff7f4';
  context.font = '800 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText('TRACE', left + 12, top + 20);
  context.font = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace';

  trace.forEach((item, index) => {
    context.fillStyle = '#9aaead';
    context.fillText(`pc ${item.pc}  ${item.op}  stack ${item.stackDepth}`, left + 12, top + 44 + index * 20);
  });
  context.restore();
}

function drawError() {
  if (!state.lastError) return;

  context.save();
  context.fillStyle = 'rgba(255, 126, 144, 0.16)';
  context.strokeStyle = 'rgba(255, 126, 144, 0.72)';
  context.fillRect(24, canvas.height - 96, canvas.width - 48, 72);
  context.strokeRect(24, canvas.height - 96, canvas.width - 48, 72);
  context.fillStyle = '#ffb2bd';
  context.font = '800 14px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText(state.lastError.message.slice(0, 110), 42, canvas.height - 55);
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
  drawPlots();
  drawTrace();
  drawBytecode();
  drawError();
}

function updateMetrics() {
  const tokenCount = state.compiled ? state.compiled.tokens.length - 1 : 0;
  const bytecodeLength = state.compiled ? state.compiled.program.bytecode.length : 0;
  const metrics = state.output ? state.output.metrics : {
    samples: 0,
    plotCount: 0,
    steps: 0,
    maxStack: 0,
  };

  elements.tokensValue.textContent = String(tokenCount);
  elements.bytecodeValue.textContent = String(bytecodeLength);
  elements.samplesMetricValue.textContent = String(metrics.samples);
  elements.plotsValue.textContent = String(metrics.plotCount);
  elements.stepsValue.textContent = String(metrics.steps);
  elements.stackValue.textContent = String(metrics.maxStack);
  if (!state.lastError) {
    elements.statusValue.textContent = state.running ? 'Running' : 'Paused';
  }
  updateLabels();
}

function runBenchmark() {
  try {
    const bench = CompilerCore.benchmark(elements.sourceEditor.value, {
      samples: getSettings().samples,
      iterations: 120,
    });
    state.lastBenchmark = bench;
    elements.benchmarkValue.textContent = `${(bench.elapsedMs / bench.iterations).toFixed(2)} ms`;
    elements.statusValue.textContent = 'Benchmark done';
  } catch (error) {
    state.lastError = error;
    elements.statusValue.textContent = 'Benchmark error';
    draw();
  }
}

function exportMetadata() {
  return {
    project: '011 - Bytecode VM Studio',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    source: elements.sourceEditor.value,
    metrics: state.output ? state.output.metrics : null,
    benchmark: state.lastBenchmark,
    bytecode: state.compiled ? state.compiled.program.bytecode : [],
    constants: state.compiled ? state.compiled.program.constants : [],
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
    'bytecode-vm-studio.json',
    'application/json',
    `${JSON.stringify(exportMetadata(), null, 2)}\n`,
  );
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'bytecode-vm-studio.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  const metrics = metadata.metrics || {};
  return [
    '# 011 - Bytecode VM Studio',
    `Preset: ${presetLabels[metadata.settings.preset] || metadata.settings.preset}`,
    `Tokens: ${elements.tokensValue.textContent}`,
    `Bytecode: ${metadata.bytecode.length}`,
    `Samples: ${metrics.samples || 0}`,
    `Plots: ${metrics.plotCount || 0}`,
    `Steps: ${metrics.steps || 0}`,
    `Benchmark: ${metadata.benchmark ? `${(metadata.benchmark.elapsedMs / metadata.benchmark.iterations).toFixed(3)} ms/run` : 'Not run'}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('bytecode-vm-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function frameLoop(now) {
  const elapsed = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
  state.lastTime = now;

  if (state.running) {
    state.phase = (state.phase + elapsed * getSettings().speed) % 1;
    compileAndRun();
  }

  requestAnimationFrame(frameLoop);
}

function attachEvents() {
  elements.presetSelect.addEventListener('change', loadPresetSource);
  elements.formatButton.addEventListener('click', loadPresetSource);
  elements.sourceEditor.addEventListener('input', compileAndRun);
  elements.samplesRange.addEventListener('input', compileAndRun);
  elements.speedRange.addEventListener('input', updateLabels);
  elements.traceToggle.addEventListener('change', draw);
  elements.bytecodeToggle.addEventListener('change', draw);
  elements.runButton.addEventListener('click', compileAndRun);
  elements.animateButton.addEventListener('click', () => {
    state.running = !state.running;
    updateMetrics();
  });
  elements.resetButton.addEventListener('click', () => {
    state.phase = 0;
    compileAndRun();
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
loadPresetSource();
requestAnimationFrame(frameLoop);
