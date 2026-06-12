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

  function segments() {
    return [
      [[0.05, 0.05], [0.95, 0.05]], [[0.95, 0.05], [0.95, 0.95]], [[0.95, 0.95], [0.05, 0.95]], [[0.05, 0.95], [0.05, 0.05]],
      [[0.24, 0.22], [0.42, 0.3]], [[0.42, 0.3], [0.35, 0.52]], [[0.65, 0.2], [0.78, 0.56]], [[0.22, 0.76], [0.58, 0.68]],
    ];
  }

  function intersectRay(origin, angle, segment) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const [a, b] = segment;
    const sx = b[0] - a[0];
    const sy = b[1] - a[1];
    const det = dx * sy - dy * sx;
    if (Math.abs(det) < 1e-9) return null;
    const qx = a[0] - origin[0];
    const qy = a[1] - origin[1];
    const t = (qx * sy - qy * sx) / det;
    const u = (qx * dy - qy * dx) / det;
    if (t >= 0 && u >= 0 && u <= 1) return { x: origin[0] + dx * t, y: origin[1] + dy * t, distance: t };
    return null;
  }

  function cast(origin, walls) {
    const angles = [];
    walls.flat().forEach(([x, y]) => {
      const angle = Math.atan2(y - origin[1], x - origin[0]);
      angles.push(angle - 0.0001, angle, angle + 0.0001);
    });
    return angles.sort((a, b) => a - b).map((angle) => {
      const hits = walls.map((wall) => intersectRay(origin, angle, wall)).filter(Boolean).sort((a, b) => a.distance - b.distance);
      return { angle, hit: hits[0] };
    }).filter((ray) => ray.hit);
  }

  function analyze() {
    const origin = [0.5, 0.5];
    const walls = segments();
    const rays = cast(origin, walls);
    return {
      points: [{ x: origin[0], y: origin[1], r: 7 }, ...rays.map((ray) => ({ x: ray.hit.x, y: ray.hit.y, r: 3 }))],
      links: rays.map((_, index) => [0, index + 1, 0.35]),
      path: [],
      series: rays.slice(0, 28).map((ray) => ray.hit.distance),
      metrics: { items: walls.length, score: rays.length, extra: Number((rays.reduce((sum, ray) => sum + ray.hit.distance, 0) / rays.length).toFixed(3)), verified: rays.length >= 20 && rays.every((ray) => Number.isFinite(ray.hit.distance)) },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, cast, intersectRay, segments };
}());
