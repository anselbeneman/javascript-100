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

  function makeTexts(options) {
    const seed = Math.floor(options.seed || 82);
    const base = Array.from({ length: 84 }, (_, index) => 't' + ((index * 7 + seed) % 37));
    const target = base.slice();
    for (let i = 0; i < target.length; i += 9) target[i] = 'x' + ((i + seed) % 19);
    for (let i = 5; i < target.length; i += 13) target.splice(i, 0, 'new' + i);
    return { base, target };
  }

  function diff(a, b) {
    const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i -= 1) {
      for (let j = b.length - 1; j >= 0; j -= 1) {
        rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { ops.push(['=', a[i]]); i += 1; j += 1; }
      else if (j < b.length && (i === a.length || rows[i][j + 1] >= rows[i + 1][j])) { ops.push(['+', b[j]]); j += 1; }
      else { ops.push(['-', a[i]]); i += 1; }
    }
    return ops;
  }

  function applyDiff(ops) {
    return ops.filter((op) => op[0] !== '-').map((op) => op[1]);
  }

  function analyze(options) {
    const texts = makeTexts(options || {});
    const ops = diff(texts.base, texts.target);
    const restored = applyDiff(ops);
    const changes = ops.filter((op) => op[0] !== '=').length;
    return {
      points: ops.slice(0, 140).map((op, index) => ({ x: (index % 28) / 27, y: Math.floor(index / 28) / 5, r: op[0] === '=' ? 2.6 : 4.8, outlier: op[0] !== '=' })),
      links: [],
      path: [],
      series: ops.slice(0, 28).map((op) => op[0] === '=' ? 0 : 1),
      metrics: {
        items: ops.length,
        score: changes,
        extra: texts.target.length,
        verified: restored.join('|') === texts.target.join('|') && changes > 0,
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

  window.ProjectCore = { analyze, benchmark, applyDiff, diff };
}());
