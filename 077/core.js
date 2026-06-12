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
    const seed = Math.floor(options.seed || 77);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const count = clamp(Math.floor(size / 42), 8, 24);
    return Array.from({ length: count }, (_, index) => {
      const x = index / (count - 1);
      const y = 0.5 + Math.sin(x * Math.PI * 2.2 + seed * 0.01) * 0.28 + Math.cos(x * Math.PI * 5) * 0.06;
      return { x, y };
    });
  }

  function naturalSpline(points) {
    const n = points.length;
    const a = points.map((point) => point.y);
    const h = Array.from({ length: n - 1 }, (_, i) => points[i + 1].x - points[i].x);
    const alpha = Array(n).fill(0);
    for (let i = 1; i < n - 1; i += 1) alpha[i] = 3 / h[i] * (a[i + 1] - a[i]) - 3 / h[i - 1] * (a[i] - a[i - 1]);
    const l = Array(n).fill(1);
    const mu = Array(n).fill(0);
    const z = Array(n).fill(0);
    for (let i = 1; i < n - 1; i += 1) {
      l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
      mu[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }
    const c = Array(n).fill(0);
    const b = Array(n - 1).fill(0);
    const d = Array(n - 1).fill(0);
    for (let j = n - 2; j >= 0; j -= 1) {
      c[j] = z[j] - mu[j] * c[j + 1];
      b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
      d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }
    return function evaluate(x) {
      let i = points.length - 2;
      for (let j = 0; j < points.length - 1; j += 1) if (x >= points[j].x && x <= points[j + 1].x) i = j;
      const dx = x - points[i].x;
      return a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
    };
  }

  function analyze(options) {
    const points = sample(options || {});
    const spline = naturalSpline(points);
    const series = Array.from({ length: 48 }, (_, index) => spline(index / 47));
    const anchorsOk = points.every((point) => Math.abs(spline(point.x) - point.y) < 1e-8);
    return {
      points: points.map((point) => ({ x: point.x, y: 1 - point.y, r: 6 })),
      links: points.slice(1).map((_, index) => [index, index + 1, 0.35]),
      path: points.map((_, index) => index),
      series: series.slice(0, 28),
      metrics: {
        items: points.length,
        score: Number((Math.max(...series) - Math.min(...series)).toFixed(3)),
        extra: series.length,
        verified: anchorsOk && series.every(Number.isFinite),
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

  window.ProjectCore = { analyze, benchmark, naturalSpline };
}());
