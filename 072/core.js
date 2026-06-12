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

  function generatePoints(options) {
    const seed = Math.floor(options.seed || 72);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const rng = createRng(seed);
    const count = clamp(Math.floor(size / 2), 100, 520);
    const points = [];
    for (let i = 0; i < count; i += 1) {
      const x = rng();
      const line = i % 2 === 0 ? 0.32 + 0.54 * x : 0.82 - 0.43 * x;
      const y = clamp(line + (rng() - 0.5) * 0.045, 0.02, 0.98);
      points.push({ x, y, line: true });
    }
    for (let i = 0; i < Math.floor(count * 0.22); i += 1) {
      points.push({ x: rng(), y: rng(), line: false });
    }
    return points;
  }

  function hough(points) {
    const thetaBins = 72;
    const rhoBins = 96;
    const accumulator = Array.from({ length: thetaBins }, () => Array(rhoBins).fill(0));
    points.forEach((point) => {
      for (let t = 0; t < thetaBins; t += 1) {
        const theta = -Math.PI / 2 + (Math.PI * t) / thetaBins;
        const rho = point.x * Math.cos(theta) + point.y * Math.sin(theta);
        const bin = Math.floor(((rho + Math.SQRT2) / (2 * Math.SQRT2)) * rhoBins);
        if (bin >= 0 && bin < rhoBins) accumulator[t][bin] += 1;
      }
    });
    let best = { theta: 0, rho: 0, votes: 0 };
    accumulator.forEach((row, theta) => row.forEach((votes, rho) => {
      if (votes > best.votes) best = { theta, rho, votes };
    }));
    return { accumulator, best };
  }

  function analyze(options) {
    const points = generatePoints(options || {});
    const transform = hough(points);
    const maxVotes = transform.best.votes;
    const series = transform.accumulator
      .map((row) => Math.max(...row))
      .sort((a, b) => b - a)
      .slice(0, 28);
    return {
      points: points.map((point) => ({ x: point.x, y: 1 - point.y, r: point.line ? 3.8 : 2.6, outlier: !point.line })),
      links: [],
      path: [],
      series,
      metrics: {
        items: points.length,
        score: maxVotes,
        extra: transform.best.theta,
        verified: maxVotes > points.length * 0.2 && series.some((value) => value === maxVotes),
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

  window.ProjectCore = { analyze, benchmark, generatePoints, hough };
}());
