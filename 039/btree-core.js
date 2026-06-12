(function () {
  'use strict';

  function createNode(leaf = true) {
    return { leaf, keys: [], children: [] };
  }

  function splitChild(parent, index, degree) {
    const full = parent.children[index];
    const right = createNode(full.leaf);
    const median = full.keys[degree - 1];
    right.keys = full.keys.slice(degree);
    full.keys = full.keys.slice(0, degree - 1);

    if (!full.leaf) {
      right.children = full.children.slice(degree);
      full.children = full.children.slice(0, degree);
    }

    parent.keys.splice(index, 0, median);
    parent.children.splice(index + 1, 0, right);
  }

  function insertNonFull(node, key, degree) {
    let index = node.keys.length - 1;
    if (node.leaf) {
      while (index >= 0 && key < node.keys[index]) index -= 1;
      if (node.keys[index] === key) return;
      node.keys.splice(index + 1, 0, key);
      return;
    }

    while (index >= 0 && key < node.keys[index]) index -= 1;
    index += 1;
    if (node.children[index].keys.length === degree * 2 - 1) {
      splitChild(node, index, degree);
      if (key > node.keys[index]) index += 1;
      if (key === node.keys[index]) return;
    }
    insertNonFull(node.children[index], key, degree);
  }

  function insert(tree, key) {
    const degree = tree.degree;
    if (tree.root.keys.length === degree * 2 - 1) {
      const root = createNode(false);
      root.children.push(tree.root);
      splitChild(root, 0, degree);
      tree.root = root;
    }
    insertNonFull(tree.root, key, degree);
  }

  function search(node, key, visited = []) {
    visited.push(node);
    let index = 0;
    while (index < node.keys.length && key > node.keys[index]) index += 1;
    if (node.keys[index] === key) return { found: true, node, index, visited };
    if (node.leaf) return { found: false, node, index: -1, visited };
    return search(node.children[index], key, visited);
  }

  function height(node) {
    return node.leaf ? 1 : 1 + height(node.children[0]);
  }

  function countNodes(node) {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }

  function flattenKeys(node) {
    if (node.leaf) return node.keys.slice();
    const keys = [];
    node.keys.forEach((key, index) => {
      keys.push(...flattenKeys(node.children[index]));
      keys.push(key);
    });
    keys.push(...flattenKeys(node.children[node.children.length - 1]));
    return keys;
  }

  function buildTree(options = {}) {
    const degree = Math.max(2, Math.min(5, Math.floor(options.degree || 3)));
    const count = Math.max(12, Math.min(90, Math.floor(options.count || 42)));
    const tree = { degree, root: createNode(true) };
    const keys = Array.from({ length: count }, (_, index) => ((index * 37 + 19) % 997) + 1);
    keys.forEach((key) => insert(tree, key));
    return { tree, keys };
  }

  function occupancy(node, degree, values = []) {
    values.push(node.keys.length / (degree * 2 - 1));
    node.children.forEach((child) => occupancy(child, degree, values));
    return values;
  }

  function analyze(options = {}) {
    const built = buildTree(options);
    const target = Number.isFinite(options.target) ? options.target : built.keys[Math.floor(built.keys.length * 0.62)];
    const result = search(built.tree.root, target, []);
    const sorted = flattenKeys(built.tree.root);
    const occupancies = occupancy(built.tree.root, built.tree.degree);

    return {
      tree: built.tree,
      insertedKeys: built.keys,
      sortedKeys: sorted,
      target,
      search: { found: result.found, depth: result.visited.length },
      metrics: {
        keys: sorted.length,
        nodes: countNodes(built.tree.root),
        height: height(built.tree.root),
        degree: built.tree.degree,
        searchDepth: result.visited.length,
        averageOccupancy: occupancies.reduce((sum, value) => sum + value, 0) / occupancies.length,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let nodes = 0;
    let depth = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, count: (options.count || 42) + index });
      nodes += result.metrics.nodes;
      depth += result.metrics.searchDepth;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgNodes: nodes / runs, avgSearchDepth: depth / runs };
  }

  window.BTreeCore = {
    analyze,
    benchmark,
    buildTree,
    countNodes,
    createNode,
    flattenKeys,
    height,
    insert,
    insertNonFull,
    search,
    splitChild,
  };
}());
