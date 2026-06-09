const canvas = document.getElementById('ikCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  solverBadge: document.getElementById('solverBadge'),
  presetBadge: document.getElementById('presetBadge'),
  targetBadge: document.getElementById('targetBadge'),
  fpsValue: document.getElementById('fpsValue'),
  errorValue: document.getElementById('errorValue'),
  iterationsValue: document.getElementById('iterationsValue'),
  chainsValue: document.getElementById('chainsValue'),
  jointsValue: document.getElementById('jointsValue'),
  reachValue: document.getElementById('reachValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  solverSelect: document.getElementById('solverSelect'),
  targetSelect: document.getElementById('targetSelect'),
  segmentRange: document.getElementById('segmentRange'),
  lengthRange: document.getElementById('lengthRange'),
  iterationsRange: document.getElementById('iterationsRange'),
  stiffnessRange: document.getElementById('stiffnessRange'),
  limitToggle: document.getElementById('limitToggle'),
  obstacleToggle: document.getElementById('obstacleToggle'),
  trailToggle: document.getElementById('trailToggle'),
  pauseButton: document.getElementById('pauseButton'),
  resetButton: document.getElementById('resetButton'),
  randomizeButton: document.getElementById('randomizeButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  segmentValue: document.getElementById('segmentValue'),
  lengthValue: document.getElementById('lengthValue'),
  iterationsControlValue: document.getElementById('iterationsControlValue'),
  stiffnessValue: document.getElementById('stiffnessValue'),
};

const state = {
  chains: [],
  obstacles: [],
  target: { x: 0, y: 0 },
  trail: [],
  seed: 9,
  running: true,
  fps: 0,
  metrics: {
    averageError: 0,
    iterations: 0,
    collisions: 0,
    joints: 0,
    averageReachRatio: 0,
  },
  lastBenchmark: null,
  elapsed: 0,
  lastTime: performance.now(),
};

function numberValue(element) {
  return Number(element.value);
}

function getSettings() {
  return {
    preset: elements.presetSelect.value,
    solver: elements.solverSelect.value,
    targetMode: elements.targetSelect.value,
    segmentCount: numberValue(elements.segmentRange),
    segmentLength: numberValue(elements.lengthRange),
    maxIterations: numberValue(elements.iterationsRange),
    maxJointAngle: numberValue(elements.stiffnessRange) * Math.PI / 180,
    clampJoints: elements.limitToggle.checked,
    avoidObstacles: elements.obstacleToggle.checked,
    showTrail: elements.trailToggle.checked,
    tolerance: 1.2,
    obstaclePadding: 12,
  };
}

function resizeCanvas() {
  const rect = frame.getBoundingClientRect();
  const width = Math.max(640, Math.floor(rect.width));
  const height = Math.max(360, Math.floor(rect.height));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    resetScene(false);
  }
}

function updateControls() {
  const settings = getSettings();
  elements.segmentValue.textContent = String(settings.segmentCount);
  elements.lengthValue.textContent = `${settings.segmentLength} px`;
  elements.iterationsControlValue.textContent = String(settings.maxIterations);
  elements.stiffnessValue.textContent = `${Math.round(settings.maxJointAngle * 180 / Math.PI)} deg`;
  elements.solverBadge.textContent = IKCore.solverLabel(settings.solver);
  elements.presetBadge.textContent = IKCore.presetLabel(settings.preset);
  elements.targetBadge.textContent = IKCore.targetLabel(settings.targetMode);
  elements.pauseButton.textContent = state.running ? 'Pause' : 'Resume';
}

function resetScene(resetTarget = true) {
  const settings = getSettings();
  const scene = IKCore.createScene({
    preset: settings.preset,
    width: canvas.width,
    height: canvas.height,
    segmentCount: settings.segmentCount,
    segmentLength: settings.segmentLength,
    seed: state.seed,
  });

  state.chains = scene.chains;
  state.obstacles = scene.obstacles;
  state.metrics = {
    averageError: 0,
    iterations: 0,
    collisions: 0,
    joints: state.chains.reduce((sum, chain) => sum + chain.points.length, 0),
    averageReachRatio: 0,
  };

  if (resetTarget) {
    state.target = { x: canvas.width * 0.62, y: canvas.height * 0.43 };
    state.trail = [];
  }

  updateControls();
  draw();
}

function setPointerTarget(event) {
  const rect = canvas.getBoundingClientRect();
  state.target = {
    x: (event.clientX - rect.left) / rect.width * canvas.width,
    y: (event.clientY - rect.top) / rect.height * canvas.height,
  };
  elements.targetSelect.value = 'pointer';
  updateControls();
}

function updateTarget(deltaSeconds) {
  const settings = getSettings();
  state.elapsed += deltaSeconds;

  if (settings.targetMode === 'orbit') {
    const radiusX = canvas.width * 0.22;
    const radiusY = canvas.height * 0.18;
    state.target = {
      x: canvas.width * 0.58 + Math.cos(state.elapsed * 0.85) * radiusX,
      y: canvas.height * 0.50 + Math.sin(state.elapsed * 1.05) * radiusY,
    };
  } else if (settings.targetMode === 'scan') {
    state.target = {
      x: canvas.width * 0.56 + Math.sin(state.elapsed * 0.82) * canvas.width * 0.28,
      y: canvas.height * 0.48 + Math.sin(state.elapsed * 1.64) * canvas.height * 0.20,
    };
  }

  state.trail.push({ x: state.target.x, y: state.target.y });
  if (state.trail.length > 160) {
    state.trail.shift();
  }
}

function solve() {
  const settings = getSettings();
  const result = IKCore.solveScene(state.chains, state.target, {
    solver: settings.solver,
    maxIterations: settings.maxIterations,
    maxJointAngle: settings.maxJointAngle,
    clampJoints: settings.clampJoints,
    avoidObstacles: settings.avoidObstacles,
    obstaclePadding: settings.obstaclePadding,
    obstacles: state.obstacles,
    tolerance: settings.tolerance,
  });

  state.chains = result.chains;
  state.metrics = result.metrics;
}

function drawGrid() {
  const spacing = 48;
  context.save();
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(137, 154, 167, 0.10)';

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

function drawObstacles() {
  const settings = getSettings();
  if (!settings.avoidObstacles) return;

  state.obstacles.forEach((obstacle) => {
    const gradient = context.createRadialGradient(
      obstacle.x - obstacle.r * 0.35,
      obstacle.y - obstacle.r * 0.35,
      obstacle.r * 0.1,
      obstacle.x,
      obstacle.y,
      obstacle.r,
    );
    gradient.addColorStop(0, 'rgba(255, 126, 144, 0.34)');
    gradient.addColorStop(1, 'rgba(255, 126, 144, 0.07)');
    context.fillStyle = gradient;
    context.strokeStyle = 'rgba(255, 126, 144, 0.54)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(obstacle.x, obstacle.y, obstacle.r, 0, IKCore.TAU);
    context.fill();
    context.stroke();
  });
}

function drawTrail() {
  if (!elements.trailToggle.checked || state.trail.length < 2) return;

  context.save();
  context.lineWidth = 2;

  for (let index = 1; index < state.trail.length; index += 1) {
    const alpha = index / state.trail.length;
    context.strokeStyle = `rgba(248, 220, 74, ${alpha * 0.36})`;
    context.beginPath();
    context.moveTo(state.trail[index - 1].x, state.trail[index - 1].y);
    context.lineTo(state.trail[index].x, state.trail[index].y);
    context.stroke();
  }

  context.restore();
}

function drawReach(chain) {
  const reach = chain.lengths.reduce((sum, length) => sum + length, 0);
  context.save();
  context.strokeStyle = 'rgba(110, 231, 216, 0.08)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(chain.root.x, chain.root.y, reach, 0, IKCore.TAU);
  context.stroke();
  context.restore();
}

function drawChain(chain, index) {
  drawReach(chain);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (let pointIndex = 1; pointIndex < chain.points.length; pointIndex += 1) {
    const a = chain.points[pointIndex - 1];
    const b = chain.points[pointIndex];
    const stress = pointIndex / (chain.points.length - 1);

    context.strokeStyle = chain.color;
    context.globalAlpha = 0.45 + stress * 0.45;
    context.lineWidth = Math.max(5, 15 - pointIndex * 0.75);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();

    context.strokeStyle = 'rgba(3, 7, 11, 0.88)';
    context.globalAlpha = 0.55;
    context.lineWidth = Math.max(2, 5 - pointIndex * 0.15);
    context.stroke();
  }

  chain.points.forEach((point, pointIndex) => {
    const radius = pointIndex === 0 ? 10 : pointIndex === chain.points.length - 1 ? 8 : 6;
    context.globalAlpha = 1;
    context.fillStyle = pointIndex === 0 ? '#f8dc4a' : '#071014';
    context.strokeStyle = pointIndex === chain.points.length - 1 ? '#ffffff' : chain.color;
    context.lineWidth = pointIndex === 0 ? 2.5 : 2;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, IKCore.TAU);
    context.fill();
    context.stroke();
  });

  const end = chain.points[chain.points.length - 1];
  context.fillStyle = chain.color;
  context.globalAlpha = 0.86;
  context.font = '700 12px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText(`C${index + 1}`, end.x + 10, end.y - 10);
  context.restore();
}

function drawTarget() {
  context.save();
  context.strokeStyle = '#f8dc4a';
  context.fillStyle = 'rgba(248, 220, 74, 0.16)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(state.target.x, state.target.y, 18, 0, IKCore.TAU);
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(state.target.x - 28, state.target.y);
  context.lineTo(state.target.x + 28, state.target.y);
  context.moveTo(state.target.x, state.target.y - 28);
  context.lineTo(state.target.x, state.target.y + 28);
  context.stroke();
  context.restore();
}

function draw() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071014');
  gradient.addColorStop(0.55, '#0d141c');
  gradient.addColorStop(1, '#121522');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawTrail();
  drawObstacles();
  state.chains.forEach(drawChain);
  drawTarget();
}

function updateMetrics() {
  const chainCount = state.chains.length;
  elements.fpsValue.textContent = `${Math.round(state.fps)}`;
  elements.errorValue.textContent = `${state.metrics.averageError.toFixed(1)} px`;
  elements.iterationsValue.textContent = `${state.metrics.iterations}`;
  elements.chainsValue.textContent = `${chainCount}`;
  elements.jointsValue.textContent = `${state.metrics.joints}`;
  elements.reachValue.textContent = `${Math.round(state.metrics.averageReachRatio * 100)}%`;
  elements.statusValue.textContent = state.running ? 'Solving' : 'Paused';
}

function frameLoop(now) {
  const deltaSeconds = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
  state.lastTime = now;
  state.fps = state.fps === 0
    ? 1 / deltaSeconds
    : state.fps * 0.9 + (1 / deltaSeconds) * 0.1;

  if (state.running) {
    updateTarget(deltaSeconds);
    solve();
  }

  draw();
  updateMetrics();
  requestAnimationFrame(frameLoop);
}

function benchmarkSolver(solver, settings, frames) {
  const scene = IKCore.createScene({
    preset: settings.preset,
    width: canvas.width,
    height: canvas.height,
    segmentCount: settings.segmentCount,
    segmentLength: settings.segmentLength,
    seed: state.seed + 101,
  });
  const target = { x: canvas.width * 0.68, y: canvas.height * 0.42 };
  let totalError = 0;
  let totalIterations = 0;
  const started = performance.now();

  for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
    target.x = canvas.width * 0.55 + Math.sin(frameIndex * 0.045) * canvas.width * 0.26;
    target.y = canvas.height * 0.50 + Math.cos(frameIndex * 0.061) * canvas.height * 0.22;
    const result = IKCore.solveScene(scene.chains, target, {
      solver,
      maxIterations: settings.maxIterations,
      maxJointAngle: settings.maxJointAngle,
      clampJoints: settings.clampJoints,
      avoidObstacles: settings.avoidObstacles,
      obstaclePadding: settings.obstaclePadding,
      obstacles: scene.obstacles,
      tolerance: settings.tolerance,
    });

    scene.chains = result.chains;
    totalError += result.metrics.averageError;
    totalIterations += result.metrics.iterations;
  }

  const elapsed = performance.now() - started;
  return {
    solver,
    averageMs: elapsed / frames,
    averageError: totalError / frames,
    averageIterations: totalIterations / frames,
  };
}

function runBenchmark() {
  const settings = getSettings();
  const frames = 180;
  const fabrik = benchmarkSolver('fabrik', settings, frames);
  const ccd = benchmarkSolver('ccd', settings, frames);

  state.lastBenchmark = {
    frames,
    fabrik,
    ccd,
  };
  elements.benchmarkValue.textContent = `F ${fabrik.averageMs.toFixed(2)} / C ${ccd.averageMs.toFixed(2)} ms`;
  elements.statusValue.textContent = 'Benchmark done';
}

function exportMetadata() {
  return {
    project: '009 - Inverse Kinematics Studio',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    seed: state.seed,
    target: {
      x: Number(state.target.x.toFixed(2)),
      y: Number(state.target.y.toFixed(2)),
    },
    metrics: {
      fps: Number(state.fps.toFixed(1)),
      averageError: Number(state.metrics.averageError.toFixed(2)),
      iterations: state.metrics.iterations,
      joints: state.metrics.joints,
      averageReachRatio: Number(state.metrics.averageReachRatio.toFixed(4)),
      benchmark: elements.benchmarkValue.textContent,
      benchmarkComparison: state.lastBenchmark,
    },
    chains: state.chains.map((chain) => ({
      root: chain.root,
      color: chain.color,
      lengths: chain.lengths.map((length) => Number(length.toFixed(2))),
      endEffector: chain.points[chain.points.length - 1],
      error: Number(chain.lastError.toFixed(2)),
      iterations: chain.iterations,
    })),
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
    'inverse-kinematics-studio.json',
    'application/json',
    `${JSON.stringify(exportMetadata(), null, 2)}\n`,
  );
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'inverse-kinematics-studio.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function technicalReport() {
  const metadata = exportMetadata();
  return [
    '# 009 - Inverse Kinematics Studio',
    `Solver: ${IKCore.solverLabel(metadata.settings.solver)}`,
    `Preset: ${IKCore.presetLabel(metadata.settings.preset)}`,
    `Chains: ${metadata.chains.length}`,
    `Joints: ${metadata.metrics.joints}`,
    `Average error: ${metadata.metrics.averageError}px`,
    `Average reach: ${Math.round(metadata.metrics.averageReachRatio * 100)}%`,
    `Benchmark: ${metadata.metrics.benchmark}`,
    `Benchmark frames: ${metadata.metrics.benchmarkComparison?.frames || 'Not run'}`,
    `Seed: ${metadata.seed}`,
  ].join('\n');
}

async function copyReport() {
  const report = technicalReport();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(report);
    elements.statusValue.textContent = 'Report copied';
  } else {
    downloadBlob('inverse-kinematics-report.md', 'text/markdown', report);
    elements.statusValue.textContent = 'Report saved';
  }
}

function randomize() {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  resetScene(true);
}

function attachEvents() {
  [
    elements.presetSelect,
    elements.segmentRange,
    elements.lengthRange,
  ].forEach((element) => {
    element.addEventListener('input', () => resetScene(true));
    element.addEventListener('change', () => resetScene(true));
  });

  [
    elements.solverSelect,
    elements.targetSelect,
    elements.iterationsRange,
    elements.stiffnessRange,
    elements.limitToggle,
    elements.obstacleToggle,
    elements.trailToggle,
  ].forEach((element) => {
    element.addEventListener('input', updateControls);
    element.addEventListener('change', updateControls);
  });

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    setPointerTarget(event);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.buttons > 0) {
      setPointerTarget(event);
    }
  });

  elements.pauseButton.addEventListener('click', () => {
    state.running = !state.running;
    updateControls();
    updateMetrics();
  });
  elements.resetButton.addEventListener('click', () => resetScene(true));
  elements.randomizeButton.addEventListener('click', randomize);
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
resetScene(true);
requestAnimationFrame(frameLoop);
