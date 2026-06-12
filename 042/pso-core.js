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

  function objective(name, x, y) {
    if (name === 'rastrigin') {
      return 20 + x * x + y * y - 10 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y));
    }
    return (1 - x) * (1 - x) + 100 * (y - x * x) * (y - x * x);
  }

  function createSwarm(options = {}) {
    const random = mulberry32(options.seed || 42);
    const count = Math.max(12, Math.min(160, Math.floor(options.count || 64)));
    return Array.from({ length: count }, () => {
      const x = random() * 5 - 2.5;
      const y = random() * 5 - 2.5;
      return {
        x,
        y,
        vx: (random() - 0.5) * 0.2,
        vy: (random() - 0.5) * 0.2,
        bestX: x,
        bestY: y,
        bestScore: Infinity,
      };
    });
  }

  function step(swarm, state, options) {
    const random = state.random;
    let global = state.global;
    swarm.forEach((particle) => {
      const score = objective(options.objective, particle.x, particle.y);
      if (score < particle.bestScore) {
        particle.bestScore = score;
        particle.bestX = particle.x;
        particle.bestY = particle.y;
      }
      if (!global || score < global.score) {
        global = { x: particle.x, y: particle.y, score };
      }
    });

    swarm.forEach((particle) => {
      particle.vx = options.inertia * particle.vx
        + options.cognitive * random() * (particle.bestX - particle.x)
        + options.social * random() * (global.x - particle.x);
      particle.vy = options.inertia * particle.vy
        + options.cognitive * random() * (particle.bestY - particle.y)
        + options.social * random() * (global.y - particle.y);
      particle.x = Math.max(-3, Math.min(3, particle.x + particle.vx));
      particle.y = Math.max(-3, Math.min(3, particle.y + particle.vy));
    });

    state.global = global;
    return global;
  }

  function run(options = {}) {
    const config = {
      objective: options.objective || 'rosenbrock',
      inertia: Number.isFinite(options.inertia) ? options.inertia : 0.68,
      cognitive: Number.isFinite(options.cognitive) ? options.cognitive : 1.45,
      social: Number.isFinite(options.social) ? options.social : 1.55,
    };
    const iterations = Math.max(1, Math.min(240, Math.floor(options.iterations || 90)));
    const swarm = createSwarm(options);
    const state = { random: mulberry32((options.seed || 42) + 777), global: null };
    const history = [];

    for (let index = 0; index < iterations; index += 1) {
      const best = step(swarm, state, config);
      history.push(best.score);
    }

    return {
      swarm,
      history,
      global: state.global,
      metrics: {
        particles: swarm.length,
        iterations,
        bestScore: state.global.score,
        bestX: state.global.x,
        bestY: state.global.y,
        improvement: history.length > 1 ? history[0] / Math.max(1e-9, state.global.score) : 1,
      },
    };
  }

  function analyze(options = {}) {
    return run(options);
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(60, Math.floor(options.runs || 12)));
    const started = performance.now();
    let score = 0;
    for (let index = 0; index < runs; index += 1) {
      score += analyze({ ...options, seed: (options.seed || 42) + index }).metrics.bestScore;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgBestScore: score / runs };
  }

  window.PsoCore = {
    analyze,
    benchmark,
    createSwarm,
    objective,
    run,
    step,
  };
}());
