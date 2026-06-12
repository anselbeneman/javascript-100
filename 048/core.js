(function () {
  'use strict';
  function point(i, n) { return { x: ((i * 37) % 97) / 97, y: ((i * 53 + 11) % 89) / 89 }; }
  function build(size) { const points = Array.from({ length: size }, (_, i) => point(i, size)); const links = []; for (let i = 0; i < size - 1; i += 1) { links.push([i, i + 1]); if (i + 4 < size) links.push([i, i + 4]); } return { points, links }; }
  function graph(links, n) { const g = Array.from({ length: n }, () => []); links.forEach(([a, b]) => { const w = Math.abs(a - b) % 7 + 1; g[a].push([b, w]); g[b].push([a, w]); }); return g; }
  function shortest(g, start, goal) { const dist = Array(g.length).fill(Infinity); const prev = Array(g.length).fill(-1); const seen = new Set(); dist[start] = 0; while (seen.size < g.length) { let u = -1; for (let i = 0; i < g.length; i += 1) if (!seen.has(i) && (u < 0 || dist[i] < dist[u])) u = i; if (u === goal || u < 0) break; seen.add(u); g[u].forEach(([v, w]) => { if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } }); } const path = []; for (let at = goal; at >= 0; at = prev[at]) path.push(at); return { distance: dist[goal], path: path.reverse(), visited: seen.size }; }
  function analyze(options) { const size = Math.max(12, Math.floor(options.size || 40)); const data = build(size); const result = shortest(graph(data.links, size), 0, size - 1); return { points: data.points, links: data.links, path: result.path, metrics: { items: size, score: result.distance, extra: result.visited, verified: result.path[0] === 0 && result.path[result.path.length - 1] === size - 1 } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, build, graph, shortest };
}());
