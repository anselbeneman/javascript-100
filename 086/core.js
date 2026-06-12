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

  function distance(a, b) {
    const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return rows[a.length][b.length];
  }

  function insert(node, word) {
    const d = distance(node.word, word);
    if (!node.children.has(d)) node.children.set(d, { word, children: new Map() });
    else insert(node.children.get(d), word);
  }

  function search(node, query, threshold, results) {
    const d = distance(node.word, query);
    if (d <= threshold) results.push({ word: node.word, distance: d });
    node.children.forEach((child, edge) => {
      if (edge >= d - threshold && edge <= d + threshold) search(child, query, threshold, results);
    });
  }

  function build(words) {
    const root = { word: words[0], children: new Map() };
    words.slice(1).forEach((word) => insert(root, word));
    return root;
  }

  function analyze() {
    const words = ['render', 'reader', 'sender', 'shader', 'shaper', 'ranker', 'runner', 'canvas', 'canvass', 'cavern', 'vector', 'factor', 'reactor', 'raster', 'master', 'worker', 'worked', 'wonder'];
    const root = build(words);
    const results = [];
    search(root, 'render', 2, results);
    const verified = results.length >= 4 && results.every((item) => distance(item.word, 'render') <= 2);
    return {
      points: words.map((_, index) => ({ x: (index % 6 + 1) / 7, y: (Math.floor(index / 6) + 1) / 4, r: results.some((item) => item.word === words[index]) ? 7 : 4 })),
      links: [],
      path: [],
      series: results.map((item) => item.distance),
      metrics: { items: words.length, score: results.length, extra: 2, verified },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, build, distance, search };
}());
