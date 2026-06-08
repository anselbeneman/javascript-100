importScripts('automata-core.js');

const Core = self.AutomataCore;
const presets = {
  conway: { name: 'Conway Life', family: 'life', rule: 'B3/S23', density: 0.24, palette: ['#05070a', '#c7ff5a'] },
  highlife: { name: 'HighLife', family: 'life', rule: 'B36/S23', density: 0.22, palette: ['#05070a', '#6df7ff'] },
  daynight: { name: 'Day And Night', family: 'life', rule: 'B3678/S34678', density: 0.46, palette: ['#05070a', '#ffde59'] },
  brian: { name: "Brian's Brain", family: 'brian', firingNeighbors: 2, density: 0.2, palette: ['#05070a', '#f8fafc', '#2ea6ff'] },
  cyclic: { name: 'Cyclic Waves', family: 'cyclic', states: 8, threshold: 3, density: 0.82, palette: ['#05070a', '#2dd4bf', '#7dd3fc', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24', '#bef264'] },
};

let width = 180;
let height = 110;
let presetId = 'conway';
let preset = presets[presetId];
let rule = Core.createRule(preset);
let wrap = true;
let generation = 0;
let cells = Core.randomGrid(width, height, rule, preset.density, '007');
let stats = Core.summarize(cells, rule.states);
let stepMs = 0;

function post(reason) {
  const snapshot = new Uint8Array(cells);
  self.postMessage({ type: 'state', reason, width, height, presetId, presetName: preset.name, palette: preset.palette, rule, wrap, generation, stepMs, stats, rle: Core.encodeRle(snapshot), cells: snapshot }, [snapshot.buffer]);
}

function configure(message) {
  presetId = message.presetId || presetId;
  preset = presets[presetId] || presets.conway;
  rule = Core.createRule({ ...preset, rule: message.ruleText || preset.rule, threshold: message.threshold, states: message.states });
  wrap = message.wrap !== false;
}

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type === 'init' || message.type === 'randomize') {
    configure(message);
    generation = 0;
    cells = Core.randomGrid(width, height, rule, message.density ?? preset.density, message.seed || `${presetId}:${Date.now()}`);
    stats = Core.summarize(cells, rule.states);
    post(message.type);
  } else if (message.type === 'configure') {
    configure(message);
    stats = Core.summarize(cells, rule.states);
    post('configure');
  } else if (message.type === 'step') {
    const start = performance.now();
    const result = Core.step(cells, width, height, rule, wrap);
    stepMs = performance.now() - start;
    cells = result.cells;
    stats = result.stats;
    generation += 1;
    post('step');
  } else if (message.type === 'paint') {
    Core.paint(cells, width, height, message.x, message.y, message.size || 3, message.mode || 'draw', rule);
    stats = Core.summarize(cells, rule.states);
    post('paint');
  } else if (message.type === 'clear') {
    cells = new Uint8Array(width * height);
    generation = 0;
    stats = Core.summarize(cells, rule.states);
    post('clear');
  }
};
