(function () {
  'use strict';
  function cast(points, t) { let layer = points.map((p) => ({ ...p })); while (layer.length > 1) layer = layer.slice(0, -1).map((p, i) => ({ x: p.x + (layer[i + 1].x - p.x) * t, y: p.y + (layer[i + 1].y - p.y) * t })); return layer[0]; }
  function analyze(options) { const size = Math.max(16, Math.floor(options.size || 80)); const controls = [{ x: .08, y: .82 }, { x: .22, y: .12 }, { x: .72, y: .18 }, { x: .92, y: .78 }]; const points = Array.from({ length: size }, (_, i) => cast(controls, i / (size - 1))); let length = 0; for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y); return { points, links: points.slice(1).map((_, i) => [i, i + 1]), series: points.map((p) => p.y), metrics: { items: size, score: length, extra: controls.length, verified: Math.abs(points[0].x - controls[0].x) < 1e-9 && Math.abs(points[points.length - 1].x - controls[3].x) < 1e-9 } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, cast };
}());
