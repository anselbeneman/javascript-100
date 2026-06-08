(function attachPathfindingCore(global) {
  'use strict';

  const presets = {
    warehouse: { label: 'Warehouse', density: 27, weight: 34, pattern: 'racks' },
    cavern: { label: 'Cavern', density: 31, weight: 48, pattern: 'cavern' },
    city: { label: 'City Blocks', density: 23, weight: 28, pattern: 'blocks' },
    maze: { label: 'Maze Lines', density: 34, weight: 18, pattern: 'maze' },
  };

  const algorithmLabels = {
    astar: 'A Star',
    dijkstra: 'Dijkstra',
    bfs: 'BFS',
    greedy: 'Greedy',
  };

  const directions4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const directions8 = [
    ...directions4,
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || 'pathfinding-lab');

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashString(seed) || 1;

    return function random() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function normalizeConfig(rawConfig) {
    const raw = rawConfig || {};
    const preset = Object.prototype.hasOwnProperty.call(presets, raw.preset) ? raw.preset : 'warehouse';
    const algorithm = Object.prototype.hasOwnProperty.call(algorithmLabels, raw.algorithm) ? raw.algorithm : 'astar';

    return {
      preset,
      presetLabel: presets[preset].label,
      algorithm,
      algorithmLabel: algorithmLabels[algorithm],
      columns: clamp(Math.round(finiteOr(raw.columns, 58)), 16, 120),
      rows: clamp(Math.round(finiteOr(raw.rows, 36)), 12, 80),
      density: clamp(Math.round(finiteOr(raw.density, presets[preset].density)), 0, 70),
      weight: clamp(Math.round(finiteOr(raw.weight, presets[preset].weight)), 0, 90),
      heuristic: clamp(finiteOr(raw.heuristic, 1), 0, 2),
      diagonal: Boolean(raw.diagonal),
      showWeights: raw.showWeights !== false,
      seed: String(raw.seed || `${preset}-004`),
    };
  }

  function indexOf(x, y, columns) {
    return y * columns + x;
  }

  function pointFromIndex(index, columns) {
    return {
      x: index % columns,
      y: Math.floor(index / columns),
    };
  }

  function noiseAt(x, y, random, pattern) {
    const jitter = random();
    const wave = (Math.sin(x * 0.37 + y * 0.19) + Math.cos(y * 0.31 - x * 0.13)) * 0.12;

    if (pattern === 'racks') {
      const rack = x % 8 < 2 && y % 6 !== 0;
      return jitter * 0.74 + wave + (rack ? 0.18 : -0.05);
    }

    if (pattern === 'blocks') {
      const road = x % 9 === 0 || y % 7 === 0;
      return jitter * 0.78 + wave + (road ? -0.28 : 0.08);
    }

    if (pattern === 'maze') {
      const stripe = (x % 6 === 0 || y % 5 === 0) && (x + y) % 4 !== 0;
      return jitter * 0.68 + wave + (stripe ? 0.22 : -0.04);
    }

    const cave = Math.sin(x * 0.22) * Math.cos(y * 0.24) + Math.sin((x + y) * 0.13);
    return jitter * 0.58 + cave * 0.22 + wave;
  }

  function createGrid(configInput) {
    const config = normalizeConfig(configInput);
    const random = createRng(`${config.seed}:${config.preset}:${config.columns}x${config.rows}`);
    const total = config.columns * config.rows;
    const walls = new Uint8Array(total);
    const weights = new Uint8Array(total);
    const pattern = presets[config.preset].pattern;

    for (let y = 0; y < config.rows; y += 1) {
      for (let x = 0; x < config.columns; x += 1) {
        const index = indexOf(x, y, config.columns);
        const border = x === 0 || y === 0 || x === config.columns - 1 || y === config.rows - 1;
        const densityThreshold = config.density / 100;
        const sample = noiseAt(x, y, random, pattern);

        walls[index] = border || sample > 1 - densityThreshold ? 1 : 0;

        if (!walls[index]) {
          const weighted = random() < config.weight / 100 || sample > 0.68;
          weights[index] = weighted ? 1 + Math.floor(random() * 7) : 1;
        }
      }
    }

    const start = { x: Math.max(1, Math.floor(config.columns * 0.12)), y: Math.max(1, Math.floor(config.rows * 0.5)) };
    const goal = { x: Math.min(config.columns - 2, Math.floor(config.columns * 0.88)), y: Math.min(config.rows - 2, Math.floor(config.rows * 0.5)) };
    carveCorridor(walls, weights, config, start, goal);

    return {
      config,
      walls,
      weights,
      start,
      goal,
      generatedAt: Date.now(),
    };
  }

  function carveCorridor(walls, weights, config, start, goal) {
    let x = start.x;
    let y = start.y;
    const clear = (cx, cy) => {
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const px = clamp(cx + ox, 1, config.columns - 2);
          const py = clamp(cy + oy, 1, config.rows - 2);
          const index = indexOf(px, py, config.columns);
          walls[index] = 0;
          weights[index] = 1;
        }
      }
    };

    clear(start.x, start.y);
    clear(goal.x, goal.y);

    while (x !== goal.x) {
      x += x < goal.x ? 1 : -1;
      clear(x, y);
    }

    while (y !== goal.y) {
      y += y < goal.y ? 1 : -1;
      clear(x, y);
    }
  }

  function cloneGrid(grid) {
    return {
      config: { ...grid.config },
      walls: new Uint8Array(grid.walls),
      weights: new Uint8Array(grid.weights),
      start: { ...grid.start },
      goal: { ...grid.goal },
      generatedAt: grid.generatedAt,
    };
  }

  class BinaryHeap {
    constructor() {
      this.items = [];
    }

    get size() {
      return this.items.length;
    }

    push(item) {
      this.items.push(item);
      this.bubbleUp(this.items.length - 1);
    }

    pop() {
      if (this.items.length === 0) {
        return null;
      }

      const top = this.items[0];
      const end = this.items.pop();

      if (this.items.length > 0) {
        this.items[0] = end;
        this.sinkDown(0);
      }

      return top;
    }

    bubbleUp(index) {
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (this.items[parent].priority <= this.items[index].priority) {
          break;
        }
        [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
        index = parent;
      }
    }

    sinkDown(index) {
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) {
          smallest = right;
        }
        if (smallest === index) {
          break;
        }
        [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
        index = smallest;
      }
    }
  }

  function heuristic(ax, ay, bx, by, diagonal) {
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return diagonal ? Math.max(dx, dy) : dx + dy;
  }

  function movementCost(dx, dy, weight) {
    const diagonalCost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
    return diagonalCost * Math.max(1, weight);
  }

  function solve(gridInput, optionsInput) {
    const grid = cloneGrid(gridInput);
    const options = {
      algorithm: grid.config.algorithm,
      diagonal: grid.config.diagonal,
      heuristic: grid.config.heuristic,
      ...optionsInput,
    };
    const total = grid.config.columns * grid.config.rows;
    const startIndex = indexOf(grid.start.x, grid.start.y, grid.config.columns);
    const goalIndex = indexOf(grid.goal.x, grid.goal.y, grid.config.columns);
    const frontier = new BinaryHeap();
    const cameFrom = new Int32Array(total);
    const costSoFar = new Float64Array(total);
    const visited = new Uint8Array(total);
    const order = [];
    let peakFrontier = 0;

    cameFrom.fill(-1);
    costSoFar.fill(Number.POSITIVE_INFINITY);
    frontier.push({ index: startIndex, priority: 0 });
    costSoFar[startIndex] = 0;

    const directions = options.diagonal ? directions8 : directions4;
    const started = global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now();

    while (frontier.size > 0) {
      peakFrontier = Math.max(peakFrontier, frontier.size);
      const current = frontier.pop();

      if (!current || visited[current.index]) {
        continue;
      }

      visited[current.index] = 1;
      order.push(current.index);

      if (current.index === goalIndex) {
        break;
      }

      const { x, y } = pointFromIndex(current.index, grid.config.columns);

      directions.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || ny < 0 || nx >= grid.config.columns || ny >= grid.config.rows) {
          return;
        }

        const nextIndex = indexOf(nx, ny, grid.config.columns);
        if (grid.walls[nextIndex]) {
          return;
        }

        const stepCost = options.algorithm === 'bfs' ? 1 : movementCost(dx, dy, grid.weights[nextIndex]);
        const newCost = costSoFar[current.index] + stepCost;

        if (newCost >= costSoFar[nextIndex]) {
          return;
        }

        costSoFar[nextIndex] = newCost;
        cameFrom[nextIndex] = current.index;

        const h = heuristic(nx, ny, grid.goal.x, grid.goal.y, options.diagonal) * options.heuristic;
        const priority = priorityFor(options.algorithm, newCost, h, order.length);
        frontier.push({ index: nextIndex, priority });
      });
    }

    const path = reconstructPath(cameFrom, startIndex, goalIndex);
    const elapsedMs = (global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now()) - started;

    return {
      order,
      path,
      cameFrom,
      cost: Number.isFinite(costSoFar[goalIndex]) ? costSoFar[goalIndex] : 0,
      found: path.length > 0,
      peakFrontier,
      elapsedMs,
      metrics: computeMetrics(grid, order, path, costSoFar[goalIndex], peakFrontier, elapsedMs),
    };
  }

  function priorityFor(algorithm, cost, h, order) {
    if (algorithm === 'dijkstra') {
      return cost;
    }
    if (algorithm === 'bfs') {
      return order;
    }
    if (algorithm === 'greedy') {
      return h;
    }
    return cost + h;
  }

  function reconstructPath(cameFrom, startIndex, goalIndex) {
    if (startIndex === goalIndex) {
      return [startIndex];
    }

    if (cameFrom[goalIndex] < 0) {
      return [];
    }

    const path = [];
    let current = goalIndex;

    while (current >= 0) {
      path.push(current);
      if (current === startIndex) {
        break;
      }
      current = cameFrom[current];
    }

    return path.reverse();
  }

  function computeTurns(path, columns) {
    let turns = 0;
    let lastDx = 0;
    let lastDy = 0;

    for (let index = 1; index < path.length; index += 1) {
      const previous = pointFromIndex(path[index - 1], columns);
      const current = pointFromIndex(path[index], columns);
      const dx = Math.sign(current.x - previous.x);
      const dy = Math.sign(current.y - previous.y);

      if (index > 1 && (dx !== lastDx || dy !== lastDy)) {
        turns += 1;
      }

      lastDx = dx;
      lastDy = dy;
    }

    return turns;
  }

  function computeMetrics(grid, order, path, cost, peakFrontier, elapsedMs) {
    const wallCount = grid.walls.reduce((sum, value) => sum + value, 0);
    const weightCount = grid.weights.reduce((sum, value) => sum + (value > 1 ? 1 : 0), 0);
    const total = grid.config.columns * grid.config.rows;

    return {
      visited: order.length,
      pathLength: path.length,
      pathCost: Number.isFinite(cost) ? cost : 0,
      turns: computeTurns(path, grid.config.columns),
      peakFrontier,
      elapsedMs,
      wallCount,
      weightCount,
      density: wallCount / total,
    };
  }

  function setCell(grid, x, y, mode) {
    if (x < 0 || y < 0 || x >= grid.config.columns || y >= grid.config.rows) {
      return grid;
    }

    const index = indexOf(x, y, grid.config.columns);
    const isStart = grid.start.x === x && grid.start.y === y;
    const isGoal = grid.goal.x === x && grid.goal.y === y;

    if (mode === 'start' && !isGoal) {
      grid.walls[index] = 0;
      grid.weights[index] = 1;
      grid.start = { x, y };
      return grid;
    }

    if (mode === 'goal' && !isStart) {
      grid.walls[index] = 0;
      grid.weights[index] = 1;
      grid.goal = { x, y };
      return grid;
    }

    if (isStart || isGoal) {
      return grid;
    }

    if (mode === 'wall') {
      grid.walls[index] = 1;
      grid.weights[index] = 0;
    } else if (mode === 'weight') {
      grid.walls[index] = 0;
      grid.weights[index] = 7;
    } else if (mode === 'erase') {
      grid.walls[index] = 0;
      grid.weights[index] = 1;
    }

    return grid;
  }

  function createExportPayload(grid, solution) {
    return {
      project: '004 - Pathfinding Algorithm Lab',
      version: 1,
      exportedAt: new Date().toISOString(),
      config: grid.config,
      start: grid.start,
      goal: grid.goal,
      walls: Array.from(grid.walls),
      weights: Array.from(grid.weights),
      metrics: solution ? solution.metrics : null,
    };
  }

  function buildTechnicalReport(grid, solution) {
    const metrics = solution ? solution.metrics : computeMetrics(grid, [], [], 0, 0, 0);

    return [
      '# 004 - Pathfinding Algorithm Lab',
      '',
      `Preset: ${grid.config.presetLabel}`,
      `Algorithm: ${grid.config.algorithmLabel}`,
      `Grid: ${grid.config.columns} x ${grid.config.rows}`,
      `Visited nodes: ${metrics.visited}`,
      `Path length: ${metrics.pathLength}`,
      `Path cost: ${metrics.pathCost.toFixed(2)}`,
      `Peak frontier: ${metrics.peakFrontier}`,
      `Runtime: ${metrics.elapsedMs.toFixed(2)} ms`,
      '',
      'Engine notes:',
      '- Deterministic seeded map generation.',
      '- Binary heap priority queue.',
      '- Pure JavaScript graph solver separated from Canvas rendering.',
    ].join('\n');
  }

  global.PathfindingCore = Object.freeze({
    presets,
    algorithmLabels,
    clamp,
    hashString,
    createRng,
    normalizeConfig,
    indexOf,
    pointFromIndex,
    createGrid,
    cloneGrid,
    setCell,
    solve,
    createExportPayload,
    buildTechnicalReport,
  });
}(typeof window !== 'undefined' ? window : globalThis));
