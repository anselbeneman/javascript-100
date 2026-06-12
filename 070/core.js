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
    const seed = Math.floor(options.seed || 70);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const nodes = clamp(Math.floor(size / 18), 14, 64);
    const rng = createRng(seed);
    const points = Array.from({ length: nodes }, (_, index) => ({
      x: 0.07 + 0.86 * index / (nodes - 1),
      y: 0.18 + 0.64 * ((index * 17 + seed) % 23) / 22,
      r: 5,
    }));
    const edges = [];
    for (let from = 0; from < nodes - 1; from += 1) {
      const maxJump = Math.min(nodes - from - 1, 4);
      for (let jump = 1; jump <= maxJump; jump += 1) {
        if (jump === 1 || rng() > 0.42) {
          const to = from + jump;
          const weight = Math.floor(rng() * 16) - (jump === 3 ? 3 : 0) + 2;
          edges.push({ from, to, weight });
        }
      }
    }
    return { nodes, points, edges, source: 0, target: nodes - 1 };
  }

  function shortestPath(graph) {
    const dist = Array(graph.nodes).fill(Infinity);
    const parent = Array(graph.nodes).fill(-1);
    dist[graph.source] = 0;
    for (let i = 0; i < graph.nodes - 1; i += 1) {
      let changed = false;
      graph.edges.forEach((edge) => {
        if (Number.isFinite(dist[edge.from]) && dist[edge.from] + edge.weight < dist[edge.to]) {
          dist[edge.to] = dist[edge.from] + edge.weight;
          parent[edge.to] = edge.from;
          changed = true;
        }
      });
      if (!changed) break;
    }
    const stable = graph.edges.every((edge) => !(Number.isFinite(dist[edge.from]) && dist[edge.from] + edge.weight < dist[edge.to]));
    const path = [];
    for (let node = graph.target; node >= 0; node = parent[node]) {
      path.push(node);
      if (node === graph.source) break;
    }
    path.reverse();
    return { dist, parent, path, stable };
  }

  function analyze(options) {
    const graph = buildGraph(options || {});
    const solved = shortestPath(graph);
    const pathSet = new Set(solved.path);
    return {
      points: graph.points.map((point, index) => ({ ...point, r: pathSet.has(index) ? 7 : 4 })),
      links: graph.edges.map((edge) => [edge.from, edge.to, edge.weight < 0 ? 1 : 0.28]),
      path: solved.path,
      series: solved.dist.filter(Number.isFinite).slice(0, 28),
      metrics: {
        items: graph.edges.length,
        score: solved.dist[graph.target],
        extra: solved.path.length,
        verified: solved.stable && solved.path[0] === graph.source && solved.path[solved.path.length - 1] === graph.target,
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

  window.ProjectCore = { analyze, benchmark, buildGraph, shortestPath };
}());
