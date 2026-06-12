(function () {
  'use strict';
  function distance(a, b) { const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); for (let i = 0; i <= a.length; i += 1) dp[i][0] = i; for (let j = 0; j <= b.length; j += 1) dp[0][j] = j; for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return { value: dp[a.length][b.length], row: dp[a.length] }; }
  function analyze(options) { const size = Math.max(12, Math.floor(options.size || 48)); const a = 'javascript'.repeat(Math.ceil(size / 10)).slice(0, size); const b = 'java-tracing-script'.repeat(Math.ceil(size / 18)).slice(0, size); const result = distance(a, b); return { series: result.row, metrics: { items: size, score: result.value, extra: result.row.length, verified: result.value >= 0 && distance(a, a).value === 0 } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, distance };
}());
