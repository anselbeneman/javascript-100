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

  function tokenHash(token) {
    let value = 2166136261;
    for (let i = 0; i < token.length; i += 1) value = Math.imul(value ^ token.charCodeAt(i), 16777619);
    return value >>> 0;
  }

  function simhash(text) {
    const weights = Array(32).fill(0);
    text.toLowerCase().split(/[^a-z]+/).filter(Boolean).forEach((token) => {
      const hash = tokenHash(token);
      for (let bit = 0; bit < 32; bit += 1) weights[bit] += (hash >>> bit) & 1 ? 1 : -1;
    });
    return weights.reduce((value, weight, bit) => weight >= 0 ? value + 2 ** bit : value, 0) >>> 0;
  }

  function hamming(a, b) {
    let value = (a ^ b) >>> 0;
    let count = 0;
    while (value) { value &= value - 1; count += 1; }
    return count;
  }

  function analyze() {
    const docs = [
      'canvas render shader pixel vector matrix',
      'canvas renders shader pixels vector matrices',
      'worker thread queue buffer runtime event',
      'search token document ranking index score',
      'canvas pixel shader render vector color',
    ];
    const hashes = docs.map(simhash);
    const near = hamming(hashes[0], hashes[1]);
    const sameTopic = hamming(hashes[0], hashes[4]);
    const far = hamming(hashes[0], hashes[2]);
    return {
      points: hashes.map((hash, index) => ({ x: (index + 1) / 6, y: 0.5, r: 4 + hamming(hashes[0], hash) })),
      links: [[0, 1, 0.8], [0, 4, 0.65]],
      path: [0, 1, 4],
      series: hashes.map((hash) => hamming(hashes[0], hash)),
      metrics: { items: docs.length, score: near, extra: far, verified: near < far && sameTopic < far },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, hamming, simhash };
}());
