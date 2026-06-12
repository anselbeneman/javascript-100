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

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return ('00000000' + (value >>> 0).toString(16)).slice(-8);
  }

  function buildTree(leaves) {
    const levels = [leaves.map(hash)];
    while (levels[levels.length - 1].length > 1) {
      const previous = levels[levels.length - 1];
      const next = [];
      for (let i = 0; i < previous.length; i += 2) next.push(hash(previous[i] + (previous[i + 1] || previous[i])));
      levels.push(next);
    }
    return levels;
  }

  function proof(levels, index) {
    const result = [];
    let cursor = index;
    for (let level = 0; level < levels.length - 1; level += 1) {
      const sibling = cursor % 2 === 0 ? cursor + 1 : cursor - 1;
      result.push({ hash: levels[level][sibling] || levels[level][cursor], left: sibling < cursor });
      cursor = Math.floor(cursor / 2);
    }
    return result;
  }

  function verifyProof(leaf, proofItems, root) {
    let current = hash(leaf);
    proofItems.forEach((item) => { current = item.left ? hash(item.hash + current) : hash(current + item.hash); });
    return current === root;
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 84);
    const count = 64;
    const leaves = Array.from({ length: count }, (_, index) => 'block-' + seed + '-' + index + '-' + ((index * 31) % 997));
    const levels = buildTree(leaves);
    const index = seed % leaves.length;
    const root = levels[levels.length - 1][0];
    const proofItems = proof(levels, index);
    const ok = verifyProof(leaves[index], proofItems, root);
    const tampered = verifyProof(leaves[index] + 'x', proofItems, root);
    return {
      points: levels.flatMap((level, levelIndex) => level.map((_, indexInLevel) => ({ x: (indexInLevel + 1) / (level.length + 1), y: (levelIndex + 1) / (levels.length + 1), r: 3 + levelIndex * 0.7 }))),
      links: [],
      path: [],
      series: levels.map((level) => level.length),
      metrics: {
        items: leaves.length,
        score: proofItems.length,
        extra: levels.length,
        verified: ok && !tampered && root.length === 8,
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

  window.ProjectCore = { analyze, benchmark, buildTree, proof, verifyProof };
}());
