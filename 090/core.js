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

  function barycentric(p, a, b, c) {
    const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    const u = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / den;
    const v = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / den;
    return { u, v, w: 1 - u - v };
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 90);
    const grid = 96;
    const a = { x: 12 + seed % 7, y: 14 };
    const b = { x: 82, y: 24 + seed % 9 };
    const c = { x: 34, y: 84 };
    const pixels = [];
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const bc = barycentric({ x, y }, a, b, c);
        if (bc.u >= 0 && bc.v >= 0 && bc.w >= 0) pixels.push({ x, y, bc });
      }
    }
    const expected = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
    const error = Math.abs(pixels.length - expected) / expected;
    return {
      points: pixels.filter((_, index) => index % 8 === 0).map((pixel) => ({ x: pixel.x / grid, y: pixel.y / grid, r: 2.2 })),
      links: [],
      path: [],
      series: pixels.slice(0, 28).map((pixel) => pixel.bc.u),
      metrics: { items: grid * grid, score: pixels.length, extra: Number(error.toFixed(4)), verified: error < 0.08 && pixels.length > 1000 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, barycentric };
}());
