const canvas = document.getElementById('mctsCanvas');
const frame = document.getElementById('canvasFrame');
const context = canvas.getContext('2d');

const elements = {
  moveBadge: document.getElementById('moveBadge'),
  seedBadge: document.getElementById('seedBadge'),
  iterationValue: document.getElementById('iterationValue'),
  nodeValue: document.getElementById('nodeValue'),
  depthValue: document.getElementById('depthValue'),
  bestMoveValue: document.getElementById('bestMoveValue'),
  winRateValue: document.getElementById('winRateValue'),
  branchValue: document.getElementById('branchValue'),
  benchmarkValue: document.getElementById('benchmarkValue'),
  statusValue: document.getElementById('statusValue'),
  presetSelect: document.getElementById('presetSelect'),
  iterationRange: document.getElementById('iterationRange'),
  explorationRange: document.getElementById('explorationRange'),
  runButton: document.getElementById('runButton'),
  benchmarkButton: document.getElementById('benchmarkButton'),
  seedButton: document.getElementById('seedButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
  reportButton: document.getElementById('reportButton'),
  iterationControlValue: document.getElementById('iterationControlValue'),
  explorationValue: document.getElementById('explorationValue'),
};

const boards = {
  empty: null,
  fork: [1, 0, 0, 0, -1, 0, 0, 0, 1],
  edge: [1, -1, 0, 0, 1, 0, -1, 0, 0],
};

const state = { seed: 22, result: null, benchmark: null };

function getSettings() {
  return {
    board: boards[elements.presetSelect.value],
    iterations: Number(elements.iterationRange.value),
    exploration: Number(elements.explorationRange.value) / 100,
    seed: state.seed,
  };
}

function updateLabels() {
  const settings = getSettings();
  elements.iterationControlValue.textContent = String(settings.iterations);
  elements.explorationValue.textContent = settings.exploration.toFixed(2);
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

function runSearch() {
  updateLabels();
  state.result = MctsCore.runSearch(getSettings());
  updateMetrics();
  draw();
}

function drawBoard() {
  const size = Math.min(canvas.width, canvas.height) * 0.42;
  const left = canvas.width * 0.08;
  const top = canvas.height * 0.18;
  const cell = size / 3;
  const board = state.result ? state.result.root.state.board : Array(9).fill(0);

  context.save();
  context.strokeStyle = '#ffde43';
  context.lineWidth = 3;
  for (let i = 1; i < 3; i += 1) {
    context.beginPath();
    context.moveTo(left + i * cell, top);
    context.lineTo(left + i * cell, top + size);
    context.moveTo(left, top + i * cell);
    context.lineTo(left + size, top + i * cell);
    context.stroke();
  }
  context.font = `${cell * 0.58}px ui-sans-serif, system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  board.forEach((value, index) => {
    const x = left + (index % 3) * cell + cell * 0.5;
    const y = top + Math.floor(index / 3) * cell + cell * 0.5;
    context.fillStyle = value === 1 ? '#74f2ce' : '#ff7890';
    context.fillText(value === 1 ? 'X' : value === -1 ? 'O' : '', x, y);
  });
  context.restore();
}

function drawTree() {
  if (!state.result) return;
  const rootX = canvas.width * 0.62;
  const rootY = canvas.height * 0.12;
  const nodes = state.result.nodes.slice(0, 180);
  const byDepth = new Map();
  nodes.forEach((node) => {
    if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
    byDepth.get(node.depth).push(node);
  });
  const positions = new Map();
  byDepth.forEach((items, depth) => {
    items.forEach((node, index) => {
      positions.set(node.id, {
        x: rootX + (index - (items.length - 1) / 2) * Math.max(16, 220 / Math.max(1, items.length)),
        y: rootY + depth * 54,
      });
    });
  });
  context.save();
  nodes.forEach((node) => {
    if (!node.parent) return;
    const a = positions.get(node.parent.id);
    const b = positions.get(node.id);
    if (!a || !b) return;
    context.strokeStyle = 'rgba(116, 242, 206, 0.18)';
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  });
  nodes.forEach((node) => {
    const point = positions.get(node.id);
    if (!point) return;
    const rate = node.visits ? node.wins / node.visits : 0;
    context.fillStyle = `rgba(${Math.round(255 - rate * 120)}, ${Math.round(100 + rate * 140)}, 210, 0.9)`;
    context.beginPath();
    context.arc(point.x, point.y, Math.max(3, Math.min(12, Math.sqrt(node.visits))), 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function draw() {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071015');
  gradient.addColorStop(1, '#15151e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawTree();
}

function updateMetrics() {
  const metrics = state.result.metrics;
  elements.iterationValue.textContent = String(metrics.iterations);
  elements.nodeValue.textContent = String(metrics.nodes);
  elements.depthValue.textContent = String(metrics.deepest);
  elements.bestMoveValue.textContent = String(metrics.bestMove);
  elements.winRateValue.textContent = `${Math.round(metrics.bestWinRate * 100)}%`;
  elements.branchValue.textContent = String(metrics.branching);
  elements.moveBadge.textContent = `Best ${metrics.bestMove}`;
  elements.statusValue.textContent = 'Searched';
}

function runBenchmark() {
  const started = performance.now();
  state.benchmark = MctsCore.benchmarkSearch({ ...getSettings(), benchmarkIterations: 8 });
  state.benchmark.averageMs = (performance.now() - started) / state.benchmark.iterations;
  elements.benchmarkValue.textContent = `${state.benchmark.averageMs.toFixed(1)} ms`;
}

function metadata() {
  return { project: '022 - MCTS Strategy Lab', exportedAt: new Date().toISOString(), settings: getSettings(), metrics: state.result && state.result.metrics, benchmark: state.benchmark };
}

function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function copyReport() {
  const data = metadata();
  const report = `# 022 - MCTS Strategy Lab\nIterations: ${data.metrics.iterations}\nNodes: ${data.metrics.nodes}\nBest move: ${data.metrics.bestMove}\nWin rate: ${(data.metrics.bestWinRate * 100).toFixed(1)}%\n`;
  if (navigator.clipboard) navigator.clipboard.writeText(report).then(() => { elements.statusValue.textContent = 'Report copied'; });
  else download('mcts-report.md', 'text/markdown', report);
}

function attachEvents() {
  [elements.presetSelect, elements.iterationRange, elements.explorationRange].forEach((element) => {
    element.addEventListener('input', runSearch);
    element.addEventListener('change', runSearch);
  });
  elements.runButton.addEventListener('click', runSearch);
  elements.benchmarkButton.addEventListener('click', runBenchmark);
  elements.seedButton.addEventListener('click', () => { state.seed = (state.seed * 1664525 + 1013904223) >>> 0; runSearch(); });
  elements.pngButton.addEventListener('click', () => { const a = document.createElement('a'); a.download = 'mcts-strategy-lab.png'; a.href = canvas.toDataURL('image/png'); a.click(); });
  elements.jsonButton.addEventListener('click', () => download('mcts-strategy-lab.json', 'application/json', `${JSON.stringify(metadata(), null, 2)}\n`));
  elements.reportButton.addEventListener('click', copyReport);
  window.addEventListener('resize', resizeCanvas);
}

attachEvents();
resizeCanvas();
runSearch();
