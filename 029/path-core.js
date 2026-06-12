(function () {
  'use strict';

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function buildGrid(options = {}) {
    const width = Math.max(16, Math.min(96, Math.floor(options.width || 42)));
    const height = Math.max(16, Math.min(72, Math.floor(options.height || 30)));
    const density = Math.max(0.05, Math.min(0.42, Number(options.density ?? 0.24)));
    const random = mulberry32(options.seed || 29);
    const start = { x: 2, y: 2 };
    const goal = { x: width - 3, y: height - 3 };
    const corridor = new Set();
    const grid = Array.from({ length: height }, () => Array(width).fill(0));

    for (let x = start.x; x <= goal.x; x += 1) {
      const t = (x - start.x) / Math.max(1, goal.x - start.x);
      const y = Math.round(start.y + (goal.y - start.y) * t + Math.sin(t * Math.PI * 3) * height * 0.08);
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = Math.max(1, Math.min(height - 2, y + dy));
        corridor.add(key(x, yy));
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        const protectedCell = corridor.has(key(x, y)) || key(x, y) === key(start.x, start.y) || key(x, y) === key(goal.x, goal.y);
        grid[y][x] = border || (!protectedCell && random() < density) ? 1 : 0;
      }
    }

    return { width, height, grid, start, goal, density };
  }

  function createHeap(compare) {
    const items = [];
    function swap(a, b) {
      const item = items[a];
      items[a] = items[b];
      items[b] = item;
    }
    function bubble(index) {
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (compare(items[parent], items[index]) <= 0) break;
        swap(parent, index);
        index = parent;
      }
    }
    function sink(index) {
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let best = index;
        if (left < items.length && compare(items[left], items[best]) < 0) best = left;
        if (right < items.length && compare(items[right], items[best]) < 0) best = right;
        if (best === index) break;
        swap(index, best);
        index = best;
      }
    }
    return {
      push(item) {
        items.push(item);
        bubble(items.length - 1);
      },
      pop() {
        if (items.length === 0) return null;
        const top = items[0];
        const last = items.pop();
        if (items.length > 0) {
          items[0] = last;
          sink(0);
        }
        return top;
      },
      get size() {
        return items.length;
      },
    };
  }

  function heuristic(a, b, mode) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (mode === 'diagonal') return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    return dx + dy;
  }

  function neighbors(node, grid, diagonal) {
    const directions = diagonal
      ? [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]
      : [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];

    return directions
      .map(([dx, dy, cost]) => ({ x: node.x + dx, y: node.y + dy, cost }))
      .filter((next) => grid[next.y] && grid[next.y][next.x] === 0);
  }

  function reconstruct(cameFrom, currentKey) {
    const path = [];
    while (currentKey) {
      const [x, y] = currentKey.split(',').map(Number);
      path.push({ x, y });
      currentKey = cameFrom.get(currentKey);
    }
    return path.reverse();
  }

  function findPath(options = {}) {
    const scene = options.scene || buildGrid(options);
    const diagonal = options.heuristic === 'diagonal';
    const open = createHeap((a, b) => a.f - b.f || a.h - b.h);
    const startKey = key(scene.start.x, scene.start.y);
    const goalKey = key(scene.goal.x, scene.goal.y);
    const cameFrom = new Map();
    const cost = new Map([[startKey, 0]]);
    const visited = new Set();
    let pushes = 0;
    let goalNode = null;

    open.push({ ...scene.start, g: 0, h: heuristic(scene.start, scene.goal, options.heuristic), f: 0 });

    while (open.size > 0) {
      const current = open.pop();
      const currentKey = key(current.x, current.y);
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (currentKey === goalKey) {
        goalNode = current;
        break;
      }

      neighbors(current, scene.grid, diagonal).forEach((next) => {
        const nextKey = key(next.x, next.y);
        const newCost = cost.get(currentKey) + next.cost;
        if (!cost.has(nextKey) || newCost < cost.get(nextKey)) {
          cameFrom.set(nextKey, currentKey);
          cost.set(nextKey, newCost);
          const h = heuristic(next, scene.goal, options.heuristic);
          open.push({ x: next.x, y: next.y, g: newCost, h, f: newCost + h });
          pushes += 1;
        }
      });
    }

    const path = goalNode ? reconstruct(cameFrom, goalKey) : [];
    const turns = path.reduce((sum, point, index) => {
      if (index < 2) return sum;
      const a = path[index - 2];
      const b = path[index - 1];
      const previous = [b.x - a.x, b.y - a.y].join(',');
      const current = [point.x - b.x, point.y - b.y].join(',');
      return sum + (previous === current ? 0 : 1);
    }, 0);

    return {
      ...scene,
      path,
      visited: [...visited].map((item) => {
        const [x, y] = item.split(',').map(Number);
        return { x, y };
      }),
      metrics: {
        solved: path.length > 0,
        pathLength: path.length,
        visited: visited.size,
        frontierPushes: pushes,
        turns,
        cost: goalNode ? cost.get(goalKey) : Infinity,
      },
    };
  }

  function analyze(options = {}) {
    return findPath({
      width: options.width || 42,
      height: options.height || 30,
      density: options.density ?? 0.24,
      seed: options.seed || 29,
      heuristic: options.heuristic || 'diagonal',
    });
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let solved = 0;
    let visited = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, seed: (options.seed || 29) + index });
      solved += result.metrics.solved ? 1 : 0;
      visited += result.metrics.visited;
    }
    return { runs, solved, avgVisited: visited / runs, avgMs: (performance.now() - started) / runs };
  }

  window.PathCore = {
    analyze,
    benchmark,
    buildGrid,
    createHeap,
    findPath,
    heuristic,
    neighbors,
  };
}());
