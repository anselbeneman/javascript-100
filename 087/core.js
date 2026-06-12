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

  function stream(options) {
    const seed = Math.floor(options.seed || 87);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    return Array.from({ length: size }, (_, index) => 'K' + ((index * 13 + seed + (index % 11)) % 41));
  }

  function hash(key, row, width) {
    let value = 2166136261 ^ (row * 16777619);
    for (let i = 0; i < key.length; i += 1) value = Math.imul(value ^ key.charCodeAt(i), 16777619);
    return (value >>> 0) % width;
  }

  function sketch(items, width, depth) {
    const table = Array.from({ length: depth }, () => Array(width).fill(0));
    items.forEach((key) => {
      for (let row = 0; row < depth; row += 1) table[row][hash(key, row, width)] += 1;
    });
    return table;
  }

  function estimate(table, key) {
    return Math.min(...table.map((row, index) => row[hash(key, index, row.length)]));
  }

  function analyze(options) {
    const items = stream(options || {});
    const table = sketch(items, 80, 4);
    const exact = new Map();
    items.forEach((key) => exact.set(key, (exact.get(key) || 0) + 1));
    const errors = [...exact.entries()].map(([key, count]) => estimate(table, key) - count);
    const verified = errors.every((error) => error >= 0) && errors.reduce((sum, value) => sum + value, 0) / errors.length < 8;
    return {
      points: table.flatMap((row, y) => row.slice(0, 80).map((value, x) => ({ x: x / 79, y: (y + 1) / 5, r: 1.8 + value / 9 }))).slice(0, 220),
      links: [],
      path: [],
      series: [...exact.values()].slice(0, 28),
      metrics: { items: items.length, score: Math.max(...exact.values()), extra: Math.max(...errors), verified },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, estimate, sketch };
}());
