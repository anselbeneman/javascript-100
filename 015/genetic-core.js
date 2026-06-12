(function attachGeneticCore(global) {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function makeRng(seed) {
    let state = (seed >>> 0) || 1;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function shuffle(values, random) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const value = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = value;
    }
    return copy;
  }

  function createCities(options = {}) {
    const count = clamp(Math.round(options.count || 28), 8, 90);
    const random = makeRng(options.seed || 15);
    const cities = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < count; index += 1) {
      const ring = Math.sqrt((index + 0.5) / count);
      const angle = index * goldenAngle + (random() - 0.5) * 0.62;
      const radius = 0.08 + ring * 0.42;
      const cluster = index % 5;
      const clusterX = Math.cos(cluster / 5 * Math.PI * 2) * 0.035;
      const clusterY = Math.sin(cluster / 5 * Math.PI * 2) * 0.035;

      cities.push({
        id: index,
        x: clamp(0.5 + Math.cos(angle) * radius + clusterX + (random() - 0.5) * 0.05, 0.05, 0.95),
        y: clamp(0.5 + Math.sin(angle) * radius + clusterY + (random() - 0.5) * 0.05, 0.05, 0.95),
      });
    }

    return cities;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function routeLength(cities, route) {
    let total = 0;

    for (let index = 0; index < route.length; index += 1) {
      const current = cities[route[index]];
      const next = cities[route[(index + 1) % route.length]];
      total += distance(current, next);
    }

    return total;
  }

  function nearestNeighborRoute(cities) {
    const remaining = new Set(cities.map((city) => city.id));
    const route = [0];
    remaining.delete(0);

    while (remaining.size) {
      const current = cities[route[route.length - 1]];
      let bestId = null;
      let bestDistance = Infinity;

      remaining.forEach((cityId) => {
        const candidate = cities[cityId];
        const value = distance(current, candidate);
        if (value < bestDistance) {
          bestDistance = value;
          bestId = cityId;
        }
      });

      route.push(bestId);
      remaining.delete(bestId);
    }

    return route;
  }

  function createPopulation(cities, size, random) {
    const baseRoute = cities.map((city) => city.id);
    const population = [];

    for (let index = 0; index < size; index += 1) {
      population.push(shuffle(baseRoute, random));
    }

    return population;
  }

  function scorePopulation(cities, population) {
    return population
      .map((route) => ({
        route,
        length: routeLength(cities, route),
      }))
      .sort((a, b) => a.length - b.length);
  }

  function tournament(scored, random, size) {
    let best = null;

    for (let index = 0; index < size; index += 1) {
      const candidate = scored[Math.floor(random() * scored.length)];
      if (!best || candidate.length < best.length) {
        best = candidate;
      }
    }

    return best.route;
  }

  function orderedCrossover(parentA, parentB, random) {
    const length = parentA.length;
    let start = Math.floor(random() * length);
    let end = Math.floor(random() * length);

    if (start > end) {
      const value = start;
      start = end;
      end = value;
    }

    const child = new Array(length).fill(null);
    const used = new Set();

    for (let index = start; index <= end; index += 1) {
      child[index] = parentA[index];
      used.add(parentA[index]);
    }

    let cursor = (end + 1) % length;
    for (let offset = 0; offset < length; offset += 1) {
      const gene = parentB[(end + 1 + offset) % length];
      if (used.has(gene)) continue;

      child[cursor] = gene;
      used.add(gene);
      cursor = (cursor + 1) % length;
    }

    return child;
  }

  function mutate(route, random, rate) {
    const next = route.slice();

    if (random() < rate) {
      const a = Math.floor(random() * next.length);
      const b = Math.floor(random() * next.length);
      const value = next[a];
      next[a] = next[b];
      next[b] = value;
    }

    if (random() < rate * 0.65) {
      let start = Math.floor(random() * next.length);
      let end = Math.floor(random() * next.length);
      if (start > end) {
        const value = start;
        start = end;
        end = value;
      }
      while (start < end) {
        const value = next[start];
        next[start] = next[end];
        next[end] = value;
        start += 1;
        end -= 1;
      }
    }

    return next;
  }

  function isValidRoute(route, cityCount) {
    if (!Array.isArray(route) || route.length !== cityCount) return false;
    const seen = new Set(route);
    if (seen.size !== cityCount) return false;
    for (let index = 0; index < cityCount; index += 1) {
      if (!seen.has(index)) return false;
    }
    return true;
  }

  function evolveGeneration(cities, population, options, random) {
    const size = population.length;
    const scored = scorePopulation(cities, population);
    const eliteCount = clamp(Math.round(size * (options.eliteRate || 0.08)), 1, Math.max(1, Math.floor(size * 0.28)));
    const next = scored.slice(0, eliteCount).map((entry) => entry.route.slice());

    while (next.length < size) {
      const parentA = tournament(scored, random, options.tournamentSize || 4);
      const parentB = tournament(scored, random, options.tournamentSize || 4);
      const child = mutate(orderedCrossover(parentA, parentB, random), random, options.mutationRate || 0.12);
      next.push(child);
    }

    return {
      population: next,
      best: scored[0],
      averageLength: scored.reduce((sum, entry) => sum + entry.length, 0) / scored.length,
    };
  }

  function runEvolution(options = {}) {
    const cityCount = clamp(Math.round(options.cityCount || 28), 8, 90);
    const populationSize = clamp(Math.round(options.populationSize || 72), 12, 240);
    const generations = clamp(Math.round(options.generations || 120), 1, 700);
    const mutationRate = clamp(Number(options.mutationRate || 0.14), 0.01, 0.55);
    const seed = options.seed || 15;
    const random = makeRng(seed + 991);
    const cities = createCities({ count: cityCount, seed });
    let population = createPopulation(cities, populationSize, random);
    const initialScores = scorePopulation(cities, population);
    const baselineRoute = nearestNeighborRoute(cities);
    const baselineLength = routeLength(cities, baselineRoute);
    let best = initialScores[0];
    const history = [{
      generation: 0,
      bestLength: best.length,
      averageLength: initialScores.reduce((sum, entry) => sum + entry.length, 0) / initialScores.length,
    }];

    for (let generation = 1; generation <= generations; generation += 1) {
      const evolved = evolveGeneration(cities, population, {
        mutationRate,
        eliteRate: options.eliteRate,
        tournamentSize: options.tournamentSize,
      }, random);

      population = evolved.population;
      if (evolved.best.length < best.length) {
        best = {
          route: evolved.best.route.slice(),
          length: evolved.best.length,
        };
      }

      history.push({
        generation,
        bestLength: best.length,
        averageLength: evolved.averageLength,
      });
    }

    return {
      cities,
      bestRoute: best.route,
      bestLength: best.length,
      initialBestLength: history[0].bestLength,
      baselineRoute,
      baselineLength,
      history,
      settings: {
        cityCount,
        populationSize,
        generations,
        mutationRate,
        seed,
      },
      improvement: history[0].bestLength > 0 ? (history[0].bestLength - best.length) / history[0].bestLength : 0,
      baselineGap: baselineLength > 0 ? (best.length - baselineLength) / baselineLength : 0,
    };
  }

  function benchmarkEvolution(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 8), 1, 60);
    const started = Date.now();
    let result = null;

    for (let index = 0; index < iterations; index += 1) {
      result = runEvolution({
        ...options,
        seed: (options.seed || 15) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastLength: result ? result.bestLength : 0,
      lastImprovement: result ? result.improvement : 0,
    };
  }

  const api = {
    benchmarkEvolution,
    createCities,
    createPopulation,
    evolveGeneration,
    isValidRoute,
    makeRng,
    mutate,
    orderedCrossover,
    routeLength,
    runEvolution,
  };

  global.GeneticCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
