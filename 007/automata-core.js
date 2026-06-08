(function attachAutomataCore(global) {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hashSeed(seed) {
    let hash = 2166136261;
    String(seed || 'automata').split('').forEach((char) => {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed) || 1;
    return function random() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function uniqueDigits(value) {
    return [...new Set(String(value || '').replace(/[^0-8]/g, '').split(''))].filter(Boolean).sort().map(Number);
  }

  function parseLifeRule(text) {
    const match = String(text || 'B3/S23').toUpperCase().replace(/\s+/g, '').match(/^B([0-8]*)\/S([0-8]*)$/);
    if (!match) throw new Error(`Invalid life rule: ${text}`);
    const birth = uniqueDigits(match[1]);
    const survival = uniqueDigits(match[2]);
    return { family: 'life', states: 2, ruleText: `B${birth.join('')}/S${survival.join('')}`, birth, survival };
  }

  function createRule(config) {
    if (config.family === 'brian') return { family: 'brian', states: 3, firingNeighbors: Number(config.firingNeighbors || 2) };
    if (config.family === 'cyclic') return { family: 'cyclic', states: clamp(Number(config.states || 8), 3, 16), threshold: clamp(Number(config.threshold || 3), 1, 8) };
    return parseLifeRule(config.rule || config.ruleText || 'B3/S23');
  }

  function indexFor(width, height, x, y, wrap) {
    if (wrap) return ((y + height) % height) * width + ((x + width) % width);
    if (x < 0 || y < 0 || x >= width || y >= height) return -1;
    return y * width + x;
  }

  function countNeighbors(cells, width, height, x, y, wrap, targetState) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const index = indexFor(width, height, x + dx, y + dy, wrap);
        if (index !== -1 && (targetState === undefined ? cells[index] > 0 : cells[index] === targetState)) count += 1;
      }
    }
    return count;
  }

  function summarize(cells, states) {
    const histogram = new Array(states).fill(0);
    let active = 0;
    cells.forEach((state) => {
      const safeState = clamp(state, 0, states - 1);
      histogram[safeState] += 1;
      if (safeState > 0) active += 1;
    });
    let entropy = 0;
    histogram.forEach((count) => {
      if (count > 0) {
        const probability = count / cells.length;
        entropy -= probability * Math.log2(probability);
      }
    });
    return { active, coverage: active / cells.length, entropy, histogram };
  }

  function step(cells, width, height, rule, wrap) {
    const next = new Uint8Array(cells.length);
    const birth = new Set(rule.birth || []);
    const survival = new Set(rule.survival || []);
    let births = 0;
    let deaths = 0;
    let changed = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const current = cells[index];
        let value = current;
        if (rule.family === 'life') {
          const neighbors = countNeighbors(cells, width, height, x, y, wrap);
          value = current > 0 ? (survival.has(neighbors) ? 1 : 0) : (birth.has(neighbors) ? 1 : 0);
        } else if (rule.family === 'brian') {
          value = current === 1 ? 2 : 0;
          if (current === 0 && countNeighbors(cells, width, height, x, y, wrap, 1) === rule.firingNeighbors) value = 1;
        } else {
          const target = (current + 1) % rule.states;
          value = countNeighbors(cells, width, height, x, y, wrap, target) >= rule.threshold ? target : current;
        }
        next[index] = value;
        if (current === 0 && value > 0) births += 1;
        if (current > 0 && value === 0) deaths += 1;
        if (current !== value) changed += 1;
      }
    }
    return { cells: next, stats: { ...summarize(next, rule.states), births, deaths, changed } };
  }

  function randomGrid(width, height, rule, density, seed) {
    const rng = createRng(seed);
    const cells = new Uint8Array(width * height);
    for (let index = 0; index < cells.length; index += 1) {
      cells[index] = rule.family === 'cyclic'
        ? (rng() < density ? Math.floor(rng() * rule.states) : 0)
        : (rng() < density ? 1 : 0);
    }
    return cells;
  }

  function paint(cells, width, height, x, y, size, mode, rule) {
    const radius = Math.floor(size / 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const index = py * width + px;
        if (mode === 'erase') cells[index] = 0;
        else if (mode === 'cycle') cells[index] = (cells[index] + 1) % rule.states;
        else cells[index] = cells[index] > 0 && mode === 'toggle' ? 0 : 1;
      }
    }
  }

  function encodeRle(cells) {
    const encoded = [];
    for (let index = 0; index < cells.length;) {
      const value = cells[index];
      let count = 1;
      while (index + count < cells.length && cells[index + count] === value) count += 1;
      encoded.push([value, count]);
      index += count;
    }
    return encoded;
  }

  function decodeRle(encoded, length) {
    const cells = new Uint8Array(length);
    let offset = 0;
    encoded.forEach(([value, count]) => {
      for (let index = 0; index < count && offset < cells.length; index += 1) {
        cells[offset] = value;
        offset += 1;
      }
    });
    return cells;
  }

  global.AutomataCore = { clamp, createRule, decodeRle, encodeRle, paint, parseLifeRule, randomGrid, step, summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.AutomataCore;
}(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis));
