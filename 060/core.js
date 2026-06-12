(function () {
  'use strict';
  function prefix(pattern) { const pi = Array(pattern.length).fill(0); for (let i = 1, j = 0; i < pattern.length; i += 1) { while (j > 0 && pattern[i] !== pattern[j]) j = pi[j - 1]; if (pattern[i] === pattern[j]) j += 1; pi[i] = j; } return pi; }
  function search(text, pattern) { const pi = prefix(pattern); const hits = []; for (let i = 0, j = 0; i < text.length; i += 1) { while (j > 0 && text[i] !== pattern[j]) j = pi[j - 1]; if (text[i] === pattern[j]) j += 1; if (j === pattern.length) { hits.push(i - pattern.length + 1); j = pi[j - 1]; } } return { hits, pi }; }
  function analyze(options) { const size = Math.max(40, Math.floor(options.size || 180)); const text = 'canvas-javascript-worker-canvas-javascript-render-'.repeat(Math.ceil(size / 50)).slice(0, size); const pattern = 'javascript'; const result = search(text, pattern); const brute = [...text.matchAll(new RegExp(pattern, 'g'))].map((m) => m.index); return { series: result.pi.concat(result.hits), metrics: { items: text.length, score: result.hits.length, extra: result.pi.reduce((a, b) => a + b, 0), verified: result.hits.join(',') === brute.join(',') } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, prefix, search };
}());
