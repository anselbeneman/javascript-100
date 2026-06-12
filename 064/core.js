(function () {
  'use strict';
  function data(size) { return Array.from({ length: size }, (_, i) => { const x = (i % 31) / 15 - 1; const y = ((i * 7) % 29) / 14 - 1; return { x, y, label: x * .9 + y * -.7 + .1 > 0 ? 1 : -1 }; }); }
  function train(samples, epochs) { const model = { wx: 0, wy: 0, b: 0 }; let mistakes = 0; for (let e = 0; e < epochs; e += 1) samples.forEach((s) => { const pred = model.wx * s.x + model.wy * s.y + model.b >= 0 ? 1 : -1; if (pred !== s.label) { model.wx += s.label * s.x; model.wy += s.label * s.y; model.b += s.label; mistakes += 1; } }); return { model, mistakes }; }
  function analyze(options) { const size = Math.max(40, Math.floor(options.size || 160)); const samples = data(size); const result = train(samples, 8); const correct = samples.filter((s) => (result.model.wx * s.x + result.model.wy * s.y + result.model.b >= 0 ? 1 : -1) === s.label).length; const points = samples.map((s) => ({ x: (s.x + 1.2) / 2.4, y: 1 - (s.y + 1.2) / 2.4 })); return { points, series: [result.model.wx, result.model.wy, result.model.b], metrics: { items: size, score: correct / size, extra: result.mistakes, verified: correct / size > .95 } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, data, train };
}());
