(function () {
  'use strict';
  function rand(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function points(size, seed) { const r = rand(seed || 49); return Array.from({ length: size }, (_, id) => ({ id, x: r(), y: r() })); }
  function build(items, depth = 0) { if (!items.length) return null; const axis = depth % 2 ? 'y' : 'x'; const sorted = items.slice().sort((a, b) => a[axis] - b[axis]); const mid = Math.floor(sorted.length / 2); return { point: sorted[mid], axis, left: build(sorted.slice(0, mid), depth + 1), right: build(sorted.slice(mid + 1), depth + 1) }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function nearest(root, target, best = { point: null, distance: Infinity, visited: 0 }) { if (!root) return best; best.visited += 1; const d = dist(root.point, target); if (d < best.distance) best = { point: root.point, distance: d, visited: best.visited }; const delta = target[root.axis] - root.point[root.axis]; const first = delta < 0 ? root.left : root.right; const second = delta < 0 ? root.right : root.left; best = nearest(first, target, best); if (Math.abs(delta) < best.distance) best = nearest(second, target, best); return best; }
  function analyze(options) { const size = Math.max(20, Math.floor(options.size || 120)); const pts = points(size, options.seed || 49); const target = { x: 0.42, y: 0.58 }; const tree = build(pts); const found = nearest(tree, target); const brute = pts.slice().sort((a, b) => dist(a, target) - dist(b, target))[0]; return { points: pts, path: [found.point.id], metrics: { items: size, score: found.distance, extra: found.visited, verified: brute.id === found.point.id } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, build, nearest, points };
}());
