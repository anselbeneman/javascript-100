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

  function buildGraph(options) {
    const seed = Math.floor(options.seed || 94);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const count = clamp(Math.floor(size / 18), 18, 64);
    const rng = createRng(seed);
    const points = Array.from({ length: count }, () => ({ x: 0.08 + rng() * 0.84, y: 0.08 + rng() * 0.84, r: 4 }));
    const edges = [];
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const weight = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (weight < 0.34 || j === i + 1) edges.push({ a: i, b: j, weight });
      }
    }
    return { points, edges };
  }

  function mst(graph) {
    const parent = graph.points.map((_, index) => index);
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) { const ra = find(a); const rb = find(b); if (ra === rb) return false; parent[rb] = ra; return true; }
    const chosen = [];
    graph.edges.slice().sort((a, b) => a.weight - b.weight).forEach((edge) => { if (union(edge.a, edge.b)) chosen.push(edge); });
    return chosen;
  }

  function analyze(options) {
    const graph = buildGraph(options || {});
    const tree = mst(graph);
    const weight = tree.reduce((sum, edge) => sum + edge.weight, 0);
    return {
      points: graph.points,
      links: tree.map((edge) => [edge.a, edge.b, 0.7]),
      path: [],
      series: tree.slice(0, 28).map((edge) => edge.weight),
      metrics: { items: graph.edges.length, score: Number(weight.toFixed(3)), extra: tree.length, verified: tree.length === graph.points.length - 1 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, buildGraph, mst };
}());
