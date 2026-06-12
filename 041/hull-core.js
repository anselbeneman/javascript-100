(function () {
  'use strict';

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function createPoints(options = {}) {
    const count = Math.max(12, Math.min(600, Math.floor(options.count || 160)));
    const random = mulberry32(options.seed || 41);
    return Array.from({ length: count }, (_, index) => {
      const ring = index % 7 === 0;
      const angle = random() * Math.PI * 2;
      const radius = ring ? 0.92 + random() * 0.06 : Math.sqrt(random()) * 0.82;
      return {
        x: Math.cos(angle) * radius + (random() - 0.5) * 0.08,
        y: Math.sin(angle) * radius + (random() - 0.5) * 0.08,
      };
    });
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function convexHull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const lower = [];
    sorted.forEach((point) => {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    });
    const upper = [];
    sorted.slice().reverse().forEach((point) => {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    });
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      area += a.x * b.y - b.x * a.y;
    }
    return Math.abs(area) * 0.5;
  }

  function perimeter(points) {
    let sum = 0;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      sum += Math.hypot(a.x - b.x, a.y - b.y);
    }
    return sum;
  }

  function containsAll(points, hull) {
    return points.every((point) => {
      for (let index = 0; index < hull.length; index += 1) {
        if (cross(hull[index], hull[(index + 1) % hull.length], point) < -1e-9) return false;
      }
      return true;
    });
  }

  function analyze(options = {}) {
    const points = options.points || createPoints(options);
    const hull = convexHull(points);
    return {
      points,
      hull,
      metrics: {
        points: points.length,
        hullPoints: hull.length,
        area: polygonArea(hull),
        perimeter: perimeter(hull),
        containsAll: containsAll(points, hull),
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let hullPoints = 0;
    for (let index = 0; index < runs; index += 1) {
      hullPoints += analyze({ count: options.count || 160, seed: (options.seed || 41) + index }).metrics.hullPoints;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgHullPoints: hullPoints / runs };
  }

  window.HullCore = {
    analyze,
    benchmark,
    containsAll,
    convexHull,
    createPoints,
    cross,
    perimeter,
    polygonArea,
  };
}());
