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

  function escapeCount(cx, cy, limit) {
    let x = 0;
    let y = 0;
    let iter = 0;
    while (x * x + y * y <= 4 && iter < limit) {
      const nextX = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = nextX;
      iter += 1;
    }
    return iter;
  }

  function analyze(options) {
    const size = clamp(Math.floor((options && options.size) || 420), 160, 1200);
    const grid = clamp(Math.floor(size / 12), 28, 86);
    const limit = 80;
    const points = [];
    const values = [];
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const cx = -2.05 + 3.0 * x / (grid - 1);
        const cy = -1.25 + 2.5 * y / (grid - 1);
        const value = escapeCount(cx, cy, limit);
        values.push(value);
        if ((x + y) % 3 === 0) points.push({ x: x / (grid - 1), y: y / (grid - 1), r: 1.6 + value / limit * 4 });
      }
    }
    const bounded = values.filter((value) => value === limit).length;
    const escaped = values.length - bounded;
    return {
      points,
      links: [],
      path: [],
      series: values.filter((_, index) => index % Math.max(1, Math.floor(values.length / 28)) === 0).slice(0, 28),
      metrics: {
        items: values.length,
        score: bounded,
        extra: escaped,
        verified: bounded > values.length * 0.08 && escaped > values.length * 0.4,
      },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) {
      analyze(options);
    }
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, escapeCount };
}());
