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

  function evolve(rule, width, generations) {
    const rows = [Array.from({ length: width }, (_, index) => index === Math.floor(width / 2) ? 1 : 0)];
    for (let y = 1; y < generations; y += 1) {
      const previous = rows[y - 1];
      rows.push(previous.map((_, x) => {
        const pattern = ((previous[x - 1] || 0) << 2) | (previous[x] << 1) | (previous[x + 1] || 0);
        return (rule >> pattern) & 1;
      }));
    }
    return rows;
  }

  function analyze() {
    const rows = evolve(110, 96, 96);
    const live = rows.flat().filter(Boolean).length;
    const transitions = rows.reduce((sum, row) => sum + row.slice(1).filter((value, index) => value !== row[index]).length, 0);
    return {
      points: rows.flatMap((row, y) => row.map((value, x) => value ? { x: x / 95, y: y / 95, r: 1.7 } : null).filter(Boolean)),
      links: [],
      path: [],
      series: rows.slice(0, 28).map((row) => row.filter(Boolean).length),
      metrics: { items: rows.length * rows[0].length, score: live, extra: transitions, verified: live > 500 && transitions > 800 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, evolve };
}());
