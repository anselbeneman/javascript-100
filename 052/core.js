(function () {
  'use strict';
  function tree(size) { const bit = Array(size + 1).fill(0); return { bit, add(i, delta) { for (let x = i + 1; x < bit.length; x += x & -x) bit[x] += delta; }, sum(i) { let total = 0; for (let x = i + 1; x > 0; x -= x & -x) total += bit[x]; return total; }, range(l, r) { return this.sum(r) - (l ? this.sum(l - 1) : 0); } }; }
  function analyze(options) { const size = Math.max(24, Math.floor(options.size || 128)); const values = Array.from({ length: size }, (_, i) => (i * 17 + 11) % 31); const fenwick = tree(size); values.forEach((value, i) => fenwick.add(i, value)); let verified = true; const series = []; for (let i = 0; i < size; i += Math.max(1, Math.floor(size / 24))) { const r = Math.min(size - 1, i + 7); const brute = values.slice(i, r + 1).reduce((a, b) => a + b, 0); const query = fenwick.range(i, r); verified = verified && brute === query; series.push(query); } return { series, metrics: { items: size, score: fenwick.range(0, size - 1), extra: series.length, verified } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, tree };
}());
