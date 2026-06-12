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

  function makeText(options) {
    const seed = Math.floor(options.seed || 95);
    const words = ['canvas', 'worker', 'matrix', 'canvas', 'shader', 'index', 'canvas', 'query', 'vector', 'runtime'];
    return Array.from({ length: clamp(Math.floor((options.size || 420) / 3), 80, 360) }, (_, index) => words[(index * 7 + seed) % words.length]).join('$');
  }

  function buildSuffixArray(text) {
    return Array.from({ length: text.length }, (_, index) => index).sort((a, b) => text.slice(a).localeCompare(text.slice(b)));
  }

  function search(text, suffixes, query) {
    return suffixes.filter((index) => text.startsWith(query, index)).sort((a, b) => a - b);
  }

  function analyze(options) {
    const text = makeText(options || {});
    const suffixes = buildSuffixArray(text);
    const found = search(text, suffixes, 'canvas');
    const direct = [];
    for (let index = text.indexOf('canvas'); index !== -1; index = text.indexOf('canvas', index + 1)) direct.push(index);
    return {
      points: found.slice(0, 160).map((value, index) => ({ x: index / 159, y: (value % 600) / 600, r: 3.5 })),
      links: [],
      path: [],
      series: found.slice(0, 28),
      metrics: { items: text.length, score: found.length, extra: suffixes.length, verified: found.join('|') === direct.join('|') && found.length > 10 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, buildSuffixArray, search };
}());
