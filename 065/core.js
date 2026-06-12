(function () {
  'use strict';
  function stream(size) { return Array.from({ length: size }, (_, i) => 'K' + ((i * 11 + (i % 7)) % 23)); }
  function misra(items, k) { const counters = new Map(); items.forEach((item) => { if (counters.has(item)) counters.set(item, counters.get(item) + 1); else if (counters.size < k - 1) counters.set(item, 1); else [...counters.keys()].forEach((key) => { const next = counters.get(key) - 1; if (next <= 0) counters.delete(key); else counters.set(key, next); }); }); return counters; }
  function analyze(options) { const size = Math.max(80, Math.floor(options.size || 320)); const items = stream(size); const counters = misra(items, 6); const exact = new Map(); items.forEach((item) => exact.set(item, (exact.get(item) || 0) + 1)); const top = [...exact.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3); return { series: [...counters.values()], metrics: { items: size, score: counters.size, extra: top[0][1], verified: top.some(([key]) => counters.has(key)) } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, misra, stream };
}());
