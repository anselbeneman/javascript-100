(function () {
  'use strict';

  function node(key) {
    return { key, left: null, right: null, height: 1 };
  }

  function height(root) {
    return root ? root.height : 0;
  }

  function update(root) {
    root.height = 1 + Math.max(height(root.left), height(root.right));
    return root;
  }

  function balance(root) {
    return root ? height(root.left) - height(root.right) : 0;
  }

  function rotateRight(root) {
    const pivot = root.left;
    root.left = pivot.right;
    pivot.right = update(root);
    return update(pivot);
  }

  function rotateLeft(root) {
    const pivot = root.right;
    root.right = pivot.left;
    pivot.left = update(root);
    return update(pivot);
  }

  function insert(root, key, stats = { rotations: 0 }) {
    if (!root) return node(key);
    if (key === root.key) return root;
    if (key < root.key) root.left = insert(root.left, key, stats);
    else root.right = insert(root.right, key, stats);

    update(root);
    const factor = balance(root);

    if (factor > 1 && key < root.left.key) {
      stats.rotations += 1;
      return rotateRight(root);
    }
    if (factor < -1 && key > root.right.key) {
      stats.rotations += 1;
      return rotateLeft(root);
    }
    if (factor > 1 && key > root.left.key) {
      root.left = rotateLeft(root.left);
      stats.rotations += 2;
      return rotateRight(root);
    }
    if (factor < -1 && key < root.right.key) {
      root.right = rotateRight(root.right);
      stats.rotations += 2;
      return rotateLeft(root);
    }
    return root;
  }

  function inOrder(root, output = []) {
    if (!root) return output;
    inOrder(root.left, output);
    output.push(root.key);
    inOrder(root.right, output);
    return output;
  }

  function count(root) {
    return root ? 1 + count(root.left) + count(root.right) : 0;
  }

  function validate(root, min = -Infinity, max = Infinity) {
    if (!root) return { valid: true, maxBalance: 0 };
    const ordered = root.key > min && root.key < max;
    const factor = Math.abs(balance(root));
    const left = validate(root.left, min, root.key);
    const right = validate(root.right, root.key, max);
    return {
      valid: ordered && factor <= 1 && left.valid && right.valid,
      maxBalance: Math.max(factor, left.maxBalance, right.maxBalance),
    };
  }

  function generateKeys(countValue) {
    return Array.from({ length: countValue }, (_, index) => ((index * 53 + 17) % 997) + 1);
  }

  function analyze(options = {}) {
    const keyCount = Math.max(8, Math.min(120, Math.floor(options.count || 48)));
    const keys = options.keys || generateKeys(keyCount);
    const stats = { rotations: 0 };
    let root = null;
    keys.forEach((key) => {
      root = insert(root, key, stats);
    });
    const validation = validate(root);
    const ordered = inOrder(root);
    return {
      keys,
      root,
      ordered,
      metrics: {
        keys: ordered.length,
        height: height(root),
        rotations: stats.rotations,
        valid: validation.valid,
        maxBalance: validation.maxBalance,
        theoreticalMax: Math.ceil(1.45 * Math.log2(ordered.length + 2)),
        nodes: count(root),
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let rotations = 0;
    let treeHeight = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ count: (options.count || 48) + index });
      rotations += result.metrics.rotations;
      treeHeight += result.metrics.height;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgRotations: rotations / runs, avgHeight: treeHeight / runs };
  }

  window.AvlCore = {
    analyze,
    balance,
    benchmark,
    count,
    generateKeys,
    height,
    inOrder,
    insert,
    rotateLeft,
    rotateRight,
    validate,
  };
}());
