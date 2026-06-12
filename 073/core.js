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

  function tokenize(text) {
    return text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  }

  function dataset() {
    return [
      ['graphics', 'canvas shader pixel render texture vector'],
      ['graphics', 'bitmap ray color raster frame canvas'],
      ['systems', 'worker queue memory buffer thread runtime'],
      ['systems', 'cache process scheduler event loop worker'],
      ['data', 'index query token ranking corpus search'],
      ['data', 'matrix cluster model feature dataset'],
      ['graphics', 'line shape gradient canvas render'],
      ['systems', 'message channel task buffer latency'],
      ['data', 'document score term query index'],
    ];
  }

  function train(rows) {
    const classes = new Map();
    const vocabulary = new Set();
    rows.forEach(([label, text]) => {
      if (!classes.has(label)) classes.set(label, { docs: 0, counts: new Map(), total: 0 });
      const bucket = classes.get(label);
      bucket.docs += 1;
      tokenize(text).forEach((token) => {
        vocabulary.add(token);
        bucket.counts.set(token, (bucket.counts.get(token) || 0) + 1);
        bucket.total += 1;
      });
    });
    return { classes, vocabulary, totalDocs: rows.length };
  }

  function classify(model, text) {
    const tokens = tokenize(text);
    let best = { label: '', score: -Infinity };
    model.classes.forEach((bucket, label) => {
      let score = Math.log(bucket.docs / model.totalDocs);
      tokens.forEach((token) => {
        score += Math.log(((bucket.counts.get(token) || 0) + 1) / (bucket.total + model.vocabulary.size));
      });
      if (score > best.score) best = { label, score };
    });
    return best.label;
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 73);
    const model = train(dataset());
    const tests = [
      ['graphics', 'canvas pixel render frame'],
      ['systems', 'worker memory queue runtime'],
      ['data', 'query document ranking index'],
      ['graphics', 'vector shader texture'],
      ['systems', 'thread scheduler latency'],
      ['data', 'cluster matrix feature'],
    ];
    const predictions = tests.map(([label, text]) => ({ label, predicted: classify(model, text) }));
    const correct = predictions.filter((item) => item.label === item.predicted).length;
    const labels = [...model.classes.keys()];
    return {
      points: labels.map((label, index) => ({ x: 0.25 + index * 0.25, y: 0.45 + ((seed + index) % 3) * 0.08, r: 18 })),
      links: [[0, 1, 0.3], [1, 2, 0.3]],
      path: predictions.map((_, index) => index),
      series: predictions.map((item) => item.label === item.predicted ? 1 : 0),
      metrics: {
        items: model.vocabulary.size,
        score: Number((correct / predictions.length).toFixed(3)),
        extra: predictions.length,
        verified: correct === predictions.length,
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

  window.ProjectCore = { analyze, benchmark, classify, train };
}());
