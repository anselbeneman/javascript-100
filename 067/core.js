(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createRng(seed) {
    let state = (seed >>> 0) || 1;
    return function rng() {
      state = (state * 1103515245 + 12345) >>> 0;
      return state / 4294967296;
    };
  }

  function buildItems(options) {
    const seed = Math.floor(options.seed || 67);
    const size = clamp(Math.floor(options.size || 360), 120, 1200);
    const count = clamp(Math.floor(size / 12), 18, 92);
    const rng = createRng(seed);
    const items = Array.from({ length: count }, (_, index) => {
      const weight = 2 + Math.floor(rng() * 35) + (index % 5);
      const rarity = 1 + ((index * 7 + seed) % 9);
      const value = Math.floor(weight * (1.6 + rng() * 3.2) + rarity * 7 + (index % 4) * 5);
      return { id: index, weight, value };
    });
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const capacity = clamp(Math.floor(totalWeight * (0.31 + (seed % 7) * 0.012)), 60, 680);
    return { items, capacity };
  }

  function solveKnapsack(items, capacity) {
    const rows = Array.from({ length: items.length + 1 }, () => new Uint32Array(capacity + 1));

    for (let i = 1; i <= items.length; i += 1) {
      const item = items[i - 1];
      const previous = rows[i - 1];
      const current = rows[i];
      for (let cap = 0; cap <= capacity; cap += 1) {
        const withoutItem = previous[cap];
        const withItem = item.weight <= cap ? previous[cap - item.weight] + item.value : 0;
        current[cap] = Math.max(withoutItem, withItem);
      }
    }

    const chosen = [];
    let cap = capacity;
    for (let i = items.length; i > 0; i -= 1) {
      if (rows[i][cap] !== rows[i - 1][cap]) {
        const item = items[i - 1];
        chosen.push(item.id);
        cap -= item.weight;
      }
    }
    chosen.reverse();

    return { value: rows[items.length][capacity], chosen, rows };
  }

  function greedyBaseline(items, capacity) {
    const chosen = [];
    let usedWeight = 0;
    let value = 0;
    items
      .slice()
      .sort((a, b) => (b.value / b.weight) - (a.value / a.weight))
      .forEach((item) => {
        if (usedWeight + item.weight <= capacity) {
          chosen.push(item.id);
          usedWeight += item.weight;
          value += item.value;
        }
      });
    return { value, chosen, weight: usedWeight };
  }

  function analyze(options) {
    const { items, capacity } = buildItems(options || {});
    const solution = solveKnapsack(items, capacity);
    const greedy = greedyBaseline(items, capacity);
    const chosenSet = new Set(solution.chosen);
    const chosenItems = items.filter((item) => chosenSet.has(item.id));
    const weight = chosenItems.reduce((sum, item) => sum + item.weight, 0);
    const value = chosenItems.reduce((sum, item) => sum + item.value, 0);
    const verified = weight <= capacity
      && value === solution.value
      && solution.value >= greedy.value
      && chosenSet.size === solution.chosen.length;
    const points = items.map((item) => ({
      x: item.weight / 42,
      y: 1 - item.value / 190,
      r: chosenSet.has(item.id) ? 7 : 4,
    }));
    const sampleRow = solution.rows[solution.rows.length - 1];
    const series = Array.from({ length: 28 }, (_, index) => {
      const cap = Math.floor(index / 27 * capacity);
      return sampleRow[cap] / Math.max(1, solution.value);
    });

    return {
      points,
      links: [],
      path: solution.chosen.slice(0, 36),
      series,
      metrics: {
        items: items.length,
        score: solution.value,
        extra: solution.value - greedy.value,
        verified,
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

  window.ProjectCore = { analyze, benchmark, buildItems, greedyBaseline, solveKnapsack };
}());
