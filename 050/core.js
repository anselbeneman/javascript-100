(function () {
  'use strict';
  function simulate(size) { const capacity = Math.max(4, Math.floor(size / 8)); const cache = new Map(); let hits = 0; let evictions = 0; const series = []; for (let i = 0; i < size; i += 1) { const key = 'K' + ((i * 7 + (i % 5)) % Math.max(6, Math.floor(size / 3))); if (cache.has(key)) { hits += 1; const value = cache.get(key); cache.delete(key); cache.set(key, value + 1); } else { if (cache.size >= capacity) { cache.delete(cache.keys().next().value); evictions += 1; } cache.set(key, 1); } series.push(cache.size); } return { capacity, hits, evictions, cache, series }; }
  function analyze(options) { const size = Math.max(40, Math.floor(options.size || 160)); const result = simulate(size); return { series: result.series.slice(-48), metrics: { items: size, score: result.hits / size, extra: result.evictions, verified: result.cache.size <= result.capacity && result.hits > 0 } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, simulate };
}());
