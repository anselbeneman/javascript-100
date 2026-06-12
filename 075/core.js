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

  function targetBits(length, seed) {
    return Array.from({ length }, (_, index) => ((index * 17 + seed * 5 + (index % 3)) % 11) > 4 ? 1 : 0);
  }

  function fitness(bits, target) {
    let score = 0;
    for (let i = 0; i < bits.length; i += 1) if (bits[i] === target[i]) score += 1;
    return score;
  }

  function evolve(options) {
    const seed = Math.floor(options.seed || 75);
    const rng = createRng(seed);
    const length = 72;
    const target = targetBits(length, seed);
    let population = Array.from({ length: 54 }, () => Array.from({ length }, () => rng() > 0.5 ? 1 : 0));
    const history = [];
    for (let generation = 0; generation < 90; generation += 1) {
      population.sort((a, b) => fitness(b, target) - fitness(a, target));
      history.push(fitness(population[0], target) / length);
      const elites = population.slice(0, 8);
      const next = elites.map((item) => item.slice());
      while (next.length < population.length) {
        const a = elites[Math.floor(rng() * elites.length)];
        const b = population[Math.floor(rng() * 22)];
        const cut = 1 + Math.floor(rng() * (length - 2));
        const child = a.slice(0, cut).concat(b.slice(cut));
        for (let i = 0; i < child.length; i += 1) if (rng() < 0.018) child[i] = 1 - child[i];
        next.push(child);
      }
      population = next;
    }
    population.sort((a, b) => fitness(b, target) - fitness(a, target));
    return { best: population[0], target, history };
  }

  function analyze(options) {
    const result = evolve(options || {});
    const bestScore = fitness(result.best, result.target);
    return {
      points: result.best.map((bit, index) => ({ x: (index % 18) / 17, y: Math.floor(index / 18) / 4, r: bit ? 5 : 3 })),
      links: [],
      path: [],
      series: result.history.slice(-28),
      metrics: {
        items: result.best.length,
        score: bestScore,
        extra: result.history.length,
        verified: bestScore >= result.best.length * 0.9,
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

  window.ProjectCore = { analyze, benchmark, evolve, fitness };
}());
