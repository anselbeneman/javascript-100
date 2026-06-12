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

  function sample(options) {
    const seed = Math.floor(options.seed || 98);
    const rng = createRng(seed);
    const radius = 0.055;
    const points = [];
    for (let attempt = 0; attempt < 9000 && points.length < 180; attempt += 1) {
      const candidate = { x: rng(), y: rng(), r: 3.5 };
      if (points.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= radius)) points.push(candidate);
    }
    return { points, radius };
  }

  function analyze(options) {
    const result = sample(options || {});
    let minDistance = Infinity;
    for (let i = 0; i < result.points.length; i += 1) for (let j = i + 1; j < result.points.length; j += 1) minDistance = Math.min(minDistance, Math.hypot(result.points[i].x - result.points[j].x, result.points[i].y - result.points[j].y));
    return {
      points: result.points,
      links: [],
      path: [],
      series: result.points.slice(0, 28).map((point) => point.x),
      metrics: { items: result.points.length, score: Number(minDistance.toFixed(4)), extra: result.radius, verified: result.points.length > 120 && minDistance >= result.radius - 1e-9 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, sample };
}());
