const canvas = document.getElementById('automataCanvas');
const context = canvas.getContext('2d');
const worker = new Worker('automata-worker.js');
const controls = {
  presetSelect: document.getElementById('presetSelect'),
  ruleInput: document.getElementById('ruleInput'),
  densityRange: document.getElementById('densityRange'),
  densityValue: document.getElementById('densityValue'),
  wrapToggle: document.getElementById('wrapToggle'),
  paintMode: document.getElementById('paintMode'),
  brushRange: document.getElementById('brushRange'),
  brushValue: document.getElementById('brushValue'),
  speedRange: document.getElementById('speedRange'),
  speedValue: document.getElementById('speedValue'),
  playButton: document.getElementById('playButton'),
  stepButton: document.getElementById('stepButton'),
  randomButton: document.getElementById('randomButton'),
  clearButton: document.getElementById('clearButton'),
  pngButton: document.getElementById('pngButton'),
  jsonButton: document.getElementById('jsonButton'),
};
const output = {
  presetBadge: document.getElementById('presetBadge'),
  ruleBadge: document.getElementById('ruleBadge'),
  statusBadge: document.getElementById('statusBadge'),
  generationValue: document.getElementById('generationValue'),
  activeValue: document.getElementById('activeValue'),
  coverageValue: document.getElementById('coverageValue'),
  changedValue: document.getElementById('changedValue'),
  entropyValue: document.getElementById('entropyValue'),
  stepValue: document.getElementById('stepValue'),
};
let latest = null;
let cells = null;
let running = true;
let pending = false;
let lastTick = 0;
let painting = false;

function post(message) { worker.postMessage(message); }
function configure(type) { post({ type, presetId: controls.presetSelect.value, ruleText: controls.ruleInput.value, density: Number(controls.densityRange.value) / 100, wrap: controls.wrapToggle.checked, seed: `${controls.presetSelect.value}:${Date.now()}` }); }
function colorFor(state) {
  const hex = (latest.palette[state % latest.palette.length] || latest.palette[0]).replace('#', '');
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}
function render() {
  if (!latest || !cells) return;
  canvas.width = latest.width;
  canvas.height = latest.height;
  const imageData = context.createImageData(latest.width, latest.height);
  const cache = new Map();
  for (let index = 0; index < cells.length; index += 1) {
    const state = cells[index];
    if (!cache.has(state)) cache.set(state, colorFor(state));
    const color = cache.get(state);
    const offset = index * 4;
    imageData.data[offset] = color[0];
    imageData.data[offset + 1] = color[1];
    imageData.data[offset + 2] = color[2];
    imageData.data[offset + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}
function updateUi() {
  const stats = latest.stats;
  output.presetBadge.textContent = latest.presetName;
  output.ruleBadge.textContent = latest.rule.ruleText || latest.rule.family;
  output.statusBadge.textContent = running ? 'Running' : 'Paused';
  output.generationValue.textContent = String(latest.generation);
  output.activeValue.textContent = String(stats.active);
  output.coverageValue.textContent = `${Math.round(stats.coverage * 100)}%`;
  output.changedValue.textContent = String(stats.changed || 0);
  output.entropyValue.textContent = stats.entropy.toFixed(2);
  output.stepValue.textContent = `${latest.stepMs.toFixed(2)} ms`;
}
function cellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width), y: Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height) };
}
function paint(event) {
  const cell = cellFromEvent(event);
  post({ type: 'paint', x: cell.x, y: cell.y, mode: controls.paintMode.value, size: Number(controls.brushRange.value) });
}
function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
worker.onmessage = (event) => {
  latest = event.data;
  cells = new Uint8Array(latest.cells);
  pending = false;
  render();
  updateUi();
};
function frame(time) {
  const interval = 1000 / Number(controls.speedRange.value);
  if (running && !pending && time - lastTick > interval) {
    pending = true;
    lastTick = time;
    post({ type: 'step' });
  }
  requestAnimationFrame(frame);
}
controls.densityRange.addEventListener('input', () => { controls.densityValue.textContent = `${controls.densityRange.value}%`; });
controls.brushRange.addEventListener('input', () => { controls.brushValue.textContent = controls.brushRange.value; });
controls.speedRange.addEventListener('input', () => { controls.speedValue.textContent = `${controls.speedRange.value}/s`; });
controls.presetSelect.addEventListener('change', () => configure('randomize'));
controls.ruleInput.addEventListener('change', () => configure('configure'));
controls.wrapToggle.addEventListener('change', () => configure('configure'));
controls.playButton.addEventListener('click', () => { running = !running; controls.playButton.textContent = running ? 'Pause' : 'Play'; updateUi(); });
controls.stepButton.addEventListener('click', () => post({ type: 'step' }));
controls.randomButton.addEventListener('click', () => configure('randomize'));
controls.clearButton.addEventListener('click', () => post({ type: 'clear' }));
controls.pngButton.addEventListener('click', () => canvas.toBlob((blob) => blob && downloadBlob(blob, `007-automata-${latest.generation}.png`)));
controls.jsonButton.addEventListener('click', () => downloadBlob(new Blob([`${JSON.stringify({ version: 1, project: '007 - Cellular Automata Lab', width: latest.width, height: latest.height, rule: latest.rule, rle: latest.rle }, null, 2)}\n`], { type: 'application/json' }), `007-automata-${latest.generation}.json`));
canvas.addEventListener('pointerdown', (event) => { painting = true; canvas.setPointerCapture(event.pointerId); paint(event); });
canvas.addEventListener('pointermove', (event) => { if (painting) paint(event); });
canvas.addEventListener('pointerup', (event) => { painting = false; canvas.releasePointerCapture(event.pointerId); });
canvas.addEventListener('pointerleave', () => { painting = false; });
configure('init');
requestAnimationFrame(frame);
