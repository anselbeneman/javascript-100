(function () {
  'use strict';

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

  function createPoints(options = {}) {
    const count = Math.max(40, Math.min(2000, Math.floor(options.count || 520)));
    const random = mulberry32(options.seed || 44);
    return Array.from({ length: count }, (_, id) => ({
      id,
      x: random(),
      y: random(),
    }));
  }

  function contains(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function intersects(a, b) {
    return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
  }

  function createNode(boundary, capacity = 8, depth = 0) {
    return { boundary, capacity, depth, points: [], children: null };
  }

  function subdivide(node) {
    const { x, y, w, h } = node.boundary;
    const hw = w / 2;
    const hh = h / 2;
    node.children = [
      createNode({ x, y, w: hw, h: hh }, node.capacity, node.depth + 1),
      createNode({ x: x + hw, y, w: hw, h: hh }, node.capacity, node.depth + 1),
      createNode({ x, y: y + hh, w: hw, h: hh }, node.capacity, node.depth + 1),
      createNode({ x: x + hw, y: y + hh, w: hw, h: hh }, node.capacity, node.depth + 1),
    ];
    const existing = node.points;
    node.points = [];
    existing.forEach((point) => insert(node, point));
  }

  function insert(node, point) {
    if (!contains(node.boundary, point)) return false;
    if (!node.children && node.points.length < node.capacity) {
      node.points.push(point);
      return true;
    }
    if (!node.children) subdivide(node);
    return node.children.some((child) => insert(child, point));
  }

  function query(node, range, output = [], stats = { visited: 0 }) {
    stats.visited += 1;
    if (!intersects(node.boundary, range)) return { points: output, stats };
    node.points.forEach((point) => {
      if (contains(range, point)) output.push(point);
    });
    if (node.children) {
      node.children.forEach((child) => query(child, range, output, stats));
    }
    return { points: output, stats };
  }

  function countNodes(node) {
    return 1 + (node.children ? node.children.reduce((sum, child) => sum + countNodes(child), 0) : 0);
  }

  function maxDepth(node) {
    return node.children ? Math.max(...node.children.map(maxDepth)) : node.depth;
  }

  function build(points, capacity = 8) {
    const root = createNode({ x: 0, y: 0, w: 1, h: 1 }, capacity);
    points.forEach((point) => insert(root, point));
    return root;
  }

  function bruteForce(points, range) {
    return points.filter((point) => contains(range, point));
  }

  function analyze(options = {}) {
    const points = createPoints(options);
    const capacity = Math.max(3, Math.min(20, Math.floor(options.capacity || 8)));
    const range = options.range || { x: 0.28, y: 0.22, w: 0.34, h: 0.42 };
    const root = build(points, capacity);
    const result = query(root, range);
    const brute = bruteForce(points, range);
    const ids = result.points.map((point) => point.id).sort((a, b) => a - b).join(',');
    const bruteIds = brute.map((point) => point.id).sort((a, b) => a - b).join(',');
    return {
      points,
      root,
      range,
      hits: result.points,
      metrics: {
        points: points.length,
        hits: result.points.length,
        bruteHits: brute.length,
        verified: ids === bruteIds,
        nodes: countNodes(root),
        depth: maxDepth(root),
        visited: result.stats.visited,
        reduction: 1 - result.stats.visited / Math.max(1, points.length),
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let visited = 0;
    let hits = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, seed: (options.seed || 44) + index });
      visited += result.metrics.visited;
      hits += result.metrics.hits;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgVisited: visited / runs, avgHits: hits / runs };
  }

  window.QuadtreeCore = {
    analyze,
    benchmark,
    bruteForce,
    build,
    contains,
    countNodes,
    createNode,
    createPoints,
    insert,
    intersects,
    maxDepth,
    query,
    subdivide,
  };
}());
