(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createRng(seed) {
    let state = (seed >>> 0) || 1;
    return function rng() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  const tiles = [
    { id: 0, n: 'g', e: 'g', s: 'g', w: 'g' },
    { id: 1, n: 'r', e: 'r', s: 'r', w: 'r' },
    { id: 2, n: 'g', e: 'r', s: 'g', w: 'r' },
    { id: 3, n: 'r', e: 'g', s: 'r', w: 'g' },
    { id: 4, n: 'g', e: 'g', s: 'r', w: 'r' },
  ];

  function compatible(a, b, direction) {
    if (direction === 'east') return a.e === b.w;
    if (direction === 'south') return a.s === b.n;
    return false;
  }

  function solve(options) {
    const seed = Math.floor(options.seed || 88);
    const rng = createRng(seed);
    const size = 18;
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const choices = tiles.filter((tile) => (
          (x === 0 || compatible(grid[y][x - 1], tile, 'east'))
          && (y === 0 || compatible(grid[y - 1][x], tile, 'south'))
        ));
        grid[y][x] = choices[Math.floor(rng() * choices.length)] || tiles[0];
      }
    }
    return grid;
  }

  function verify(grid) {
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        if (x < grid[y].length - 1 && !compatible(grid[y][x], grid[y][x + 1], 'east')) return false;
        if (y < grid.length - 1 && !compatible(grid[y][x], grid[y + 1][x], 'south')) return false;
      }
    }
    return true;
  }

  function analyze(options) {
    const grid = solve(options || {});
    const flat = grid.flat();
    return {
      points: flat.map((tile, index) => ({ x: (index % grid.length) / (grid.length - 1), y: Math.floor(index / grid.length) / (grid.length - 1), r: 3 + tile.id })),
      links: [],
      path: [],
      series: tiles.map((tile) => flat.filter((item) => item.id === tile.id).length),
      metrics: { items: flat.length, score: new Set(flat.map((tile) => tile.id)).size, extra: tiles.length, verified: verify(grid) },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, compatible, solve, verify };
}());
