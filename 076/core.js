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
    const seed = Math.floor(options.seed || 76);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const rng = createRng(seed);
    const count = clamp(Math.floor(size / 3), 80, 360);
    const centers = [[0.24, 0.28], [0.72, 0.34], [0.52, 0.74]];
    const points = [];
    centers.forEach(([cx, cy], cluster) => {
      for (let i = 0; i < count / centers.length; i += 1) {
        points.push({ x: clamp(cx + (rng() - 0.5) * 0.18, 0, 1), y: clamp(cy + (rng() - 0.5) * 0.18, 0, 1), cluster });
      }
    });
    for (let i = 0; i < count * 0.12; i += 1) points.push({ x: rng(), y: rng(), cluster: -1 });
    return points;
  }

  function neighbors(points, index, eps) {
    const p = points[index];
    const result = [];
    points.forEach((q, qIndex) => {
      if (Math.hypot(p.x - q.x, p.y - q.y) <= eps) result.push(qIndex);
    });
    return result;
  }

  function dbscan(points, eps, minPts) {
    const labels = Array(points.length).fill(undefined);
    let clusterId = 0;
    points.forEach((_, index) => {
      if (labels[index] !== undefined) return;
      const seeds = neighbors(points, index, eps);
      if (seeds.length < minPts) {
        labels[index] = -1;
        return;
      }
      labels[index] = clusterId;
      for (let cursor = 0; cursor < seeds.length; cursor += 1) {
        const pointIndex = seeds[cursor];
        if (labels[pointIndex] === -1) labels[pointIndex] = clusterId;
        if (labels[pointIndex] !== undefined) continue;
        labels[pointIndex] = clusterId;
        const expanded = neighbors(points, pointIndex, eps);
        if (expanded.length >= minPts) expanded.forEach((item) => { if (!seeds.includes(item)) seeds.push(item); });
      }
      clusterId += 1;
    });
    return labels;
  }

  function analyze(options) {
    const points = generatePoints(options || {});
    const labels = dbscan(points, 0.095, 5);
    const clusterCount = new Set(labels.filter((label) => label >= 0)).size;
    const noise = labels.filter((label) => label === -1).length;
    return {
      points: points.map((point, index) => ({ x: point.x, y: point.y, r: labels[index] === -1 ? 2.7 : 4.5, outlier: labels[index] === -1 })),
      links: [],
      path: [],
      series: [...new Set(labels)].map((label) => labels.filter((item) => item === label).length),
      metrics: {
        items: points.length,
        score: clusterCount,
        extra: noise,
        verified: clusterCount >= 3 && noise > 0 && noise < points.length * 0.35,
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

  window.ProjectCore = { analyze, benchmark, dbscan, neighbors };
}());
