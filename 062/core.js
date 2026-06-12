(function () {
  'use strict';
  function rand(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sample(size, k, seed) { const r = rand(seed); const out = []; for (let i = 0; i < size; i += 1) { if (i < k) out.push(i); else { const j = Math.floor(r() * (i + 1)); if (j < k) out[j] = i; } } return out; }
  function analyze(options) { const size = Math.max(80, Math.floor(options.size || 500)); const k = Math.max(8, Math.floor(Math.sqrt(size))); const out = sample(size, k, options.seed || 62); const unique = new Set(out).size; return { series: out.slice(0, 48), metrics: { items: size, score: out.reduce((a, b) => a + b, 0) / out.length, extra: k, verified: out.length === k && unique === k && Math.max(...out) < size } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, sample };
}());
