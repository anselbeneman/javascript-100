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
    const seed = Math.floor(options.seed || 69);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const nodes = clamp(Math.floor(size / 22), 14, 54);
    const rng = createRng(seed);
    const points = Array.from({ length: nodes }, (_, index) => {
      const angle = (Math.PI * 2 * index) / nodes;
      const radius = 0.34 + (rng() - 0.5) * 0.09;
      return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius, r: 5 };
    });
    const links = [];
    for (let from = 0; from < nodes; from += 1) {
      const degree = 2 + ((from + seed) % 4);
      for (let k = 0; k < degree; k += 1) {
        const to = (from * 7 + k * 11 + seed) % nodes;
        if (to !== from) links.push([from, to]);
      }
      if (rng() > 0.72) links.push([from, Math.floor(rng() * nodes)]);
    }
    return { points, links, nodes };
  }

  function rankGraph(graph, iterations) {
    const damping = 0.85;
    const outgoing = Array.from({ length: graph.nodes }, () => []);
    graph.links.forEach(([from, to]) => outgoing[from].push(to));
    let ranks = Array(graph.nodes).fill(1 / graph.nodes);
    for (let step = 0; step < iterations; step += 1) {
      const next = Array(graph.nodes).fill((1 - damping) / graph.nodes);
      outgoing.forEach((targets, from) => {
        if (targets.length === 0) return;
        const share = ranks[from] * damping / targets.length;
        targets.forEach((to) => { next[to] += share; });
      });
      ranks = next;
    }
    return ranks;
  }

  function analyze(options) {
    const graph = buildGraph(options || {});
    const ranks = rankGraph(graph, 48);
    const total = ranks.reduce((sum, value) => sum + value, 0);
    const ranked = ranks.map((rank, index) => ({ rank, index })).sort((a, b) => b.rank - a.rank);
    const points = graph.points.map((point, index) => ({ ...point, r: 4 + ranks[index] * graph.nodes * 7 }));
    return {
      points,
      links: graph.links.map(([from, to]) => [from, to, ranks[to] * graph.nodes]),
      path: ranked.slice(0, 8).map((item) => item.index),
      series: ranked.slice(0, 28).map((item) => item.rank * graph.nodes),
      metrics: {
        items: graph.links.length,
        score: Number((ranked[0].rank * 100).toFixed(3)),
        extra: 48,
        verified: Math.abs(total - 1) < 0.001 && ranked[0].rank > ranked[ranked.length - 1].rank,
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

  window.ProjectCore = { analyze, benchmark, buildGraph, rankGraph };
}());
