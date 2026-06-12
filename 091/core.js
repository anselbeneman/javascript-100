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

  function simulate(options) {
    const count = 28;
    const rest = 0.025;
    const points = Array.from({ length: count }, (_, index) => ({ x: 0.2 + index * rest, y: 0.18, px: 0.2 + index * rest, py: 0.18 }));
    for (let step = 0; step < 140; step += 1) {
      points.forEach((point, index) => {
        if (index === 0) return;
        const vx = point.x - point.px;
        const vy = point.y - point.py;
        point.px = point.x;
        point.py = point.y;
        point.x += vx * 0.995;
        point.y += vy * 0.995 + 0.0009;
      });
      for (let iter = 0; iter < 24; iter += 1) {
        points[0].x = 0.2;
        points[0].y = 0.18;
        for (let i = 0; i < points.length - 1; i += 1) {
          const a = points[i];
          const b = points[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const correction = (len - rest) / len * 0.5;
          if (i !== 0) { a.x += dx * correction; a.y += dy * correction; }
          b.x -= dx * correction;
          b.y -= dy * correction;
        }
      }
    }
    return { points, rest };
  }

  function analyze(options) {
    const result = simulate(options || {});
    const errors = result.points.slice(1).map((point, index) => Math.abs(Math.hypot(point.x - result.points[index].x, point.y - result.points[index].y) - result.rest));
    const maxError = Math.max(...errors);
    return {
      points: result.points.map((point, index) => ({ x: point.x, y: point.y, r: index === 0 ? 6 : 4 })),
      links: result.points.slice(1).map((_, index) => [index, index + 1, 0.7]),
      path: [],
      series: errors.slice(0, 28),
      metrics: { items: result.points.length, score: Number(maxError.toFixed(5)), extra: 140, verified: maxError < 0.0025 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, simulate };
}());
