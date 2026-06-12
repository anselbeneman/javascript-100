(function () {
  'use strict';

  const features = ['latency', 'interactions', 'visual'];

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

  function createDataset(options = {}) {
    const count = Math.max(40, Math.min(600, Math.floor(options.count || 180)));
    const random = mulberry32(options.seed || 34);
    return Array.from({ length: count }, () => {
      const latency = random();
      const interactions = random();
      const visual = random();
      const score = visual * 0.45 + interactions * 0.38 + (1 - latency) * 0.32;
      const label = score + (random() - 0.5) * 0.12 > 0.72 ? 'hire' : 'pass';
      return { latency, interactions, visual, label };
    });
  }

  function gini(rows) {
    if (rows.length === 0) return 0;
    const counts = rows.reduce((map, row) => {
      map[row.label] = (map[row.label] || 0) + 1;
      return map;
    }, {});
    return 1 - Object.values(counts).reduce((sum, count) => {
      const p = count / rows.length;
      return sum + p * p;
    }, 0);
  }

  function majority(rows) {
    const counts = rows.reduce((map, row) => {
      map[row.label] = (map[row.label] || 0) + 1;
      return map;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }

  function splitRows(rows, feature, threshold) {
    const left = [];
    const right = [];
    rows.forEach((row) => {
      (row[feature] <= threshold ? left : right).push(row);
    });
    return { left, right };
  }

  function bestSplit(rows) {
    const base = gini(rows);
    let best = null;
    features.forEach((feature) => {
      const values = [...new Set(rows.map((row) => row[feature].toFixed(3)).map(Number))]
        .sort((a, b) => a - b)
        .filter((_, index, list) => index > 0 && index < list.length - 1);
      const thresholds = values.filter((_, index) => index % Math.max(1, Math.floor(values.length / 18)) === 0);
      thresholds.forEach((threshold) => {
        const { left, right } = splitRows(rows, feature, threshold);
        if (left.length < 4 || right.length < 4) return;
        const impurity = (left.length / rows.length) * gini(left) + (right.length / rows.length) * gini(right);
        const gain = base - impurity;
        if (!best || gain > best.gain) {
          best = { feature, threshold, gain, left, right };
        }
      });
    });
    return best;
  }

  function buildTree(rows, options = {}, depth = 0) {
    const maxDepth = options.maxDepth || 5;
    const minSize = options.minSize || 8;
    const label = majority(rows);
    const impurity = gini(rows);

    if (depth >= maxDepth || rows.length <= minSize || impurity === 0) {
      return { type: 'leaf', label, rows: rows.length, impurity, depth };
    }

    const split = bestSplit(rows);
    if (!split || split.gain <= 0.005) {
      return { type: 'leaf', label, rows: rows.length, impurity, depth };
    }

    return {
      type: 'split',
      label,
      rows: rows.length,
      impurity,
      depth,
      feature: split.feature,
      threshold: split.threshold,
      gain: split.gain,
      left: buildTree(split.left, options, depth + 1),
      right: buildTree(split.right, options, depth + 1),
    };
  }

  function predict(tree, row) {
    if (tree.type === 'leaf') return tree.label;
    return predict(row[tree.feature] <= tree.threshold ? tree.left : tree.right, row);
  }

  function countNodes(tree) {
    if (!tree) return 0;
    if (tree.type === 'leaf') return 1;
    return 1 + countNodes(tree.left) + countNodes(tree.right);
  }

  function evaluate(tree, rows) {
    const correct = rows.filter((row) => predict(tree, row) === row.label).length;
    return { correct, total: rows.length, accuracy: correct / rows.length };
  }

  function analyze(options = {}) {
    const rows = createDataset(options);
    const trainCount = Math.floor(rows.length * 0.72);
    const train = rows.slice(0, trainCount);
    const test = rows.slice(trainCount);
    const tree = buildTree(train, { maxDepth: options.maxDepth || 5, minSize: options.minSize || 8 });
    const trainEval = evaluate(tree, train);
    const testEval = evaluate(tree, test);

    return {
      rows,
      train,
      test,
      tree,
      metrics: {
        rows: rows.length,
        trainRows: train.length,
        testRows: test.length,
        nodes: countNodes(tree),
        trainAccuracy: trainEval.accuracy,
        testAccuracy: testEval.accuracy,
        rootImpurity: tree.impurity,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(50, Math.floor(options.runs || 12)));
    const started = performance.now();
    let accuracy = 0;
    let nodes = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, seed: (options.seed || 34) + index });
      accuracy += result.metrics.testAccuracy;
      nodes += result.metrics.nodes;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgAccuracy: accuracy / runs, avgNodes: nodes / runs };
  }

  window.TreeCore = {
    analyze,
    benchmark,
    bestSplit,
    buildTree,
    countNodes,
    createDataset,
    evaluate,
    gini,
    predict,
    splitRows,
  };
}());
