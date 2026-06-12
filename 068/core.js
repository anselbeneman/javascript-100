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
    const seed = Math.floor(options.seed || 68);
    const size = clamp(Math.floor(options.size || 360), 120, 1200);
    const count = clamp(Math.floor(size / 2), 90, 600);
    const rng = createRng(seed);
    const slope = 0.62 + (seed % 9) * 0.035;
    const intercept = 0.18 + (seed % 5) * 0.018;
    const outlierRate = 0.24 + (seed % 4) * 0.025;
    const points = Array.from({ length: count }, (_, index) => {
      const x = rng();
      const isOutlier = rng() < outlierRate;
      const noise = (rng() - 0.5) * 0.06;
      const y = isOutlier ? rng() : clamp(slope * x + intercept + noise, 0.02, 0.98);
      return { x, y, outlier: isOutlier, id: index };
    });
    return { points, truth: { slope, intercept }, outlierRate };
  }

  function lineFromPoints(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-9) {
      return null;
    }
    const normalX = -dy / length;
    const normalY = dx / length;
    const c = -(normalX * a.x + normalY * a.y);
    return { normalX, normalY, c };
  }

  function distanceToLine(point, line) {
    return Math.abs(line.normalX * point.x + line.normalY * point.y + line.c);
  }

  function leastSquares(points) {
    const n = points.length;
    const sums = points.reduce((acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      acc.xx += point.x * point.x;
      acc.xy += point.x * point.y;
      return acc;
    }, { x: 0, y: 0, xx: 0, xy: 0 });
    const denominator = n * sums.xx - sums.x * sums.x;
    const slope = Math.abs(denominator) < 1e-9 ? 0 : (n * sums.xy - sums.x * sums.y) / denominator;
    const intercept = (sums.y - slope * sums.x) / n;
    return { slope, intercept };
  }

  function ransac(points, options) {
    const seed = Math.floor(options.seed || 68);
    const iterations = clamp(Math.floor(options.iterations || 180), 40, 420);
    const threshold = options.threshold || 0.045;
    const rng = createRng(seed * 17 + points.length);
    let best = { inliers: [], line: null, residual: Infinity };

    for (let i = 0; i < iterations; i += 1) {
      const a = points[Math.floor(rng() * points.length)];
      let b = points[Math.floor(rng() * points.length)];
      if (a === b) {
        b = points[(b.id + 1) % points.length];
      }
      const line = lineFromPoints(a, b);
      if (!line) {
        continue;
      }
      const inliers = points.filter((point) => distanceToLine(point, line) <= threshold);
      const residual = inliers.reduce((sum, point) => sum + distanceToLine(point, line), 0) / Math.max(1, inliers.length);
      if (
        inliers.length > best.inliers.length
        || (inliers.length === best.inliers.length && residual < best.residual)
      ) {
        best = { inliers, line, residual };
      }
    }

    const refined = leastSquares(best.inliers.length >= 2 ? best.inliers : points);
    const refinedLine = lineFromPoints(
      { x: 0, y: refined.intercept },
      { x: 1, y: refined.slope + refined.intercept },
    );
    const refinedInliers = points.filter((point) => distanceToLine(point, refinedLine) <= threshold);
    const residual = refinedInliers.reduce((sum, point) => sum + distanceToLine(point, refinedLine), 0) / Math.max(1, refinedInliers.length);

    return { ...refined, inliers: refinedInliers, residual, threshold };
  }

  function analyze(options) {
    const dataset = generatePoints(options || {});
    const fit = ransac(dataset.points, options || {});
    const inlierIds = new Set(fit.inliers.map((point) => point.id));
    const slopeError = Math.abs(fit.slope - dataset.truth.slope);
    const interceptError = Math.abs(fit.intercept - dataset.truth.intercept);
    const verified = fit.inliers.length > dataset.points.length * 0.58
      && fit.residual < fit.threshold * 0.75
      && slopeError < 0.16
      && interceptError < 0.12;
    const points = dataset.points.map((point) => ({
      x: point.x,
      y: 1 - point.y,
      r: inlierIds.has(point.id) ? 4.8 : 2.8,
      outlier: point.outlier,
    }));
    const lineStart = { x: 0, y: 1 - fit.intercept, r: 6 };
    const lineEnd = { x: 1, y: 1 - (fit.slope + fit.intercept), r: 6 };
    const visualPoints = [...points, lineStart, lineEnd];
    const series = Array.from({ length: 28 }, (_, index) => {
      const point = dataset.points[Math.floor(index / 27 * (dataset.points.length - 1))];
      const predicted = fit.slope * point.x + fit.intercept;
      return Math.abs(point.y - predicted) / Math.max(0.001, fit.threshold);
    });

    return {
      points: visualPoints,
      links: [[visualPoints.length - 2, visualPoints.length - 1, 1]],
      path: [visualPoints.length - 2, visualPoints.length - 1],
      series,
      metrics: {
        items: dataset.points.length,
        score: fit.inliers.length,
        extra: Number((fit.residual * 1000).toFixed(2)),
        verified,
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

  window.ProjectCore = { analyze, benchmark, distanceToLine, generatePoints, leastSquares, ransac };
}());
