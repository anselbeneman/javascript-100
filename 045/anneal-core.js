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

  function createCities(options = {}) {
    const count = Math.max(8, Math.min(80, Math.floor(options.count || 28)));
    const random = mulberry32(options.seed || 45);
    return Array.from({ length: count }, (_, id) => {
      const angle = id / count * Math.PI * 2;
      const ring = 0.34 + (id % 5) * 0.08;
      return {
        id,
        x: 0.5 + Math.cos(angle) * ring + (random() - 0.5) * 0.12,
        y: 0.5 + Math.sin(angle) * ring + (random() - 0.5) * 0.12,
      };
    });
  }

  function routeLength(cities, route) {
    let sum = 0;
    for (let index = 0; index < route.length; index += 1) {
      const a = cities[route[index]];
      const b = cities[route[(index + 1) % route.length]];
      sum += Math.hypot(a.x - b.x, a.y - b.y);
    }
    return sum;
  }

  function twoOpt(route, i, j) {
    const next = route.slice();
    while (i < j) {
      const value = next[i];
      next[i] = next[j];
      next[j] = value;
      i += 1;
      j -= 1;
    }
    return next;
  }

  function run(options = {}) {
    const cities = createCities(options);
    const random = mulberry32((options.seed || 45) + 101);
    const iterations = Math.max(100, Math.min(8000, Math.floor(options.iterations || 2200)));
    const cooling = Number.isFinite(options.cooling) ? options.cooling : 0.995;
    let temperature = Number.isFinite(options.temperature) ? options.temperature : 1.4;
    let route = cities.map((city) => city.id);
    for (let index = route.length - 1; index > 1; index -= 1) {
      const swapIndex = 1 + Math.floor(random() * index);
      const value = route[index];
      route[index] = route[swapIndex];
      route[swapIndex] = value;
    }
    let currentLength = routeLength(cities, route);
    let bestRoute = route.slice();
    let bestLength = currentLength;
    let accepted = 0;
    const history = [{ step: 0, length: currentLength, temperature }];

    for (let step = 1; step <= iterations; step += 1) {
      let i = 1 + Math.floor(random() * (route.length - 2));
      let j = 1 + Math.floor(random() * (route.length - 2));
      if (i > j) [i, j] = [j, i];
      if (i === j) j = Math.min(route.length - 1, i + 1);
      const candidate = twoOpt(route, i, j);
      const candidateLength = routeLength(cities, candidate);
      const delta = candidateLength - currentLength;
      if (delta < 0 || Math.exp(-delta / Math.max(1e-9, temperature)) > random()) {
        route = candidate;
        currentLength = candidateLength;
        accepted += 1;
        if (currentLength < bestLength) {
          bestLength = currentLength;
          bestRoute = route.slice();
        }
      }
      temperature *= cooling;
      if (step % Math.max(1, Math.floor(iterations / 32)) === 0 || step === iterations) {
        history.push({ step, length: bestLength, temperature });
      }
    }

    return {
      cities,
      route: bestRoute,
      history,
      metrics: {
        cities: cities.length,
        iterations,
        initialLength: history[0].length,
        bestLength,
        improvement: (history[0].length - bestLength) / history[0].length,
        accepted,
        acceptanceRate: accepted / iterations,
      },
    };
  }

  function analyze(options = {}) {
    return run(options);
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(50, Math.floor(options.runs || 8)));
    const started = performance.now();
    let improvement = 0;
    for (let index = 0; index < runs; index += 1) {
      improvement += analyze({ ...options, seed: (options.seed || 45) + index }).metrics.improvement;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgImprovement: improvement / runs };
  }

  window.AnnealCore = {
    analyze,
    benchmark,
    createCities,
    routeLength,
    run,
    twoOpt,
  };
}());
