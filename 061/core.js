(function () {
  'use strict';
  function values(size) { return Array.from({ length: size }, (_, i) => (i * 97 + 31) % 1009); }
  function select(arr, k) { let left = 0; let right = arr.length - 1; while (left <= right) { const pivot = arr[(left + right) >> 1]; let i = left; let j = right; while (i <= j) { while (arr[i] < pivot) i += 1; while (arr[j] > pivot) j -= 1; if (i <= j) { [arr[i], arr[j]] = [arr[j], arr[i]]; i += 1; j -= 1; } } if (k <= j) right = j; else if (k >= i) left = i; else return arr[k]; } return arr[k]; }
  function analyze(options) { const size = Math.max(31, Math.floor(options.size || 151)); const arr = values(size); const k = size >> 1; const value = select(arr.slice(), k); const sorted = arr.slice().sort((a, b) => a - b); return { series: sorted.slice(0, 48), metrics: { items: size, score: value, extra: k, verified: value === sorted[k] } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, select, values };
}());
