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

  function sdf(x, y) {
    const spheres = [
      { x: 0.42, y: 0.5, r: 0.04 },
      { x: 0.66, y: 0.48, r: 0.03 },
      { x: 0.56, y: 0.68, r: 0.025 },
    ];
    return Math.min(...spheres.map((s) => Math.hypot(x - s.x, y - s.y) - s.r));
  }

  function march(origin, dir) {
    let x = origin.x;
    let y = origin.y;
    let total = 0;
    for (let step = 0; step < 64; step += 1) {
      const d = sdf(x, y);
      if (d < 0.002) return { hit: true, x, y, steps: step + 1, distance: total };
      if (total > 1.8) return { hit: false, x, y, steps: step + 1, distance: total };
      x += dir.x * d;
      y += dir.y * d;
      total += d;
    }
    return { hit: false, x, y, steps: 64, distance: total };
  }

  function analyze(options) {
    const rays = clamp(Math.floor(((options && options.size) || 260) / 4), 64, 180);
    const origin = { x: 0.05, y: 0.5 };
    const results = Array.from({ length: rays }, (_, index) => {
      const screenY = 0.12 + 0.76 * index / (rays - 1);
      const target = { x: 1, y: screenY };
      const len = Math.hypot(target.x - origin.x, target.y - origin.y);
      return march(origin, { x: (target.x - origin.x) / len, y: (target.y - origin.y) / len });
    });
    const hits = results.filter((result) => result.hit);
    const avgSteps = results.reduce((sum, result) => sum + result.steps, 0) / results.length;
    return {
      points: results.map((result) => ({ x: clamp(result.x, 0, 1), y: clamp(result.y, 0, 1), r: result.hit ? 4.4 : 2.1, outlier: !result.hit })),
      links: [],
      path: [],
      series: results.slice(0, 28).map((result) => result.steps),
      metrics: { items: rays, score: hits.length, extra: Number(avgSteps.toFixed(2)), verified: hits.length > rays * 0.18 && hits.length < rays * 0.55 && avgSteps > 3 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, march, sdf };
}());
