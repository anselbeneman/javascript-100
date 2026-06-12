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

  function makeIntervals(options) {
    const seed = Math.floor(options.seed || 96);
    const rng = createRng(seed);
    return Array.from({ length: 120 }, (_, index) => {
      const start = rng() * 0.92;
      const end = Math.min(1, start + 0.03 + rng() * 0.16);
      return { start, end, id: index };
    });
  }

  function build(intervals) {
    if (intervals.length === 0) return null;
    const points = intervals.flatMap((item) => [item.start, item.end]).sort((a, b) => a - b);
    const center = points[Math.floor(points.length / 2)];
    return {
      center,
      hits: intervals.filter((item) => item.start <= center && item.end >= center),
      left: build(intervals.filter((item) => item.end < center)),
      right: build(intervals.filter((item) => item.start > center)),
    };
  }

  function query(node, range, out) {
    if (!node) return;
    node.hits.forEach((item) => { if (item.start <= range.end && item.end >= range.start) out.push(item.id); });
    if (range.start <= node.center) query(node.left, range, out);
    if (range.end >= node.center) query(node.right, range, out);
  }

  function analyze(options) {
    const intervals = makeIntervals(options || {});
    const tree = build(intervals);
    const range = { start: 0.38, end: 0.58 };
    const found = [];
    query(tree, range, found);
    const brute = intervals.filter((item) => item.start <= range.end && item.end >= range.start).map((item) => item.id).sort((a, b) => a - b);
    found.sort((a, b) => a - b);
    return {
      points: intervals.map((item) => ({ x: (item.start + item.end) / 2, y: (item.id % 24) / 23, r: found.includes(item.id) ? 5 : 2.6 })),
      links: [],
      path: [],
      series: found.slice(0, 28),
      metrics: { items: intervals.length, score: found.length, extra: brute.length, verified: found.join('|') === brute.join('|') },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, build, makeIntervals, query };
}());
