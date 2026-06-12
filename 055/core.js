(function () {
  'use strict';
  function prefs(size, offset) { return Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i * 7 + j * 3 + offset) % size)); }
  function match(size) { const men = prefs(size, 1); const women = prefs(size, 5); const rank = women.map((list) => Object.fromEntries(list.map((m, i) => [m, i]))); const next = Array(size).fill(0); const free = Array.from({ length: size }, (_, i) => i); const engaged = Array(size).fill(-1); let proposals = 0; while (free.length) { const m = free.shift(); const w = men[m][next[m]++]; proposals += 1; if (engaged[w] < 0) engaged[w] = m; else if (rank[w][m] < rank[w][engaged[w]]) { free.push(engaged[w]); engaged[w] = m; } else free.push(m); } return { pairs: engaged.map((m, w) => ({ m, w })), proposals, men, women }; }
  function stable(result) {
    const womanByMan = new Map(result.pairs.map((pair) => [pair.m, pair.w]));
    const manByWoman = new Map(result.pairs.map((pair) => [pair.w, pair.m]));
    for (let m = 0; m < result.men.length; m += 1) {
      const currentWoman = womanByMan.get(m);
      for (const w of result.men[m]) {
        if (w === currentWoman) break;
        const currentMan = manByWoman.get(w);
        if (result.women[w].indexOf(m) < result.women[w].indexOf(currentMan)) {
          return false;
        }
      }
    }
    return true;
  }
  function analyze(options) { const size = Math.max(4, Math.min(32, Math.floor((options.size || 16) / 4))); const result = match(size); const points = result.pairs.flatMap((pair, i) => [{ x: 0.25, y: (i + 1) / (size + 1) }, { x: 0.75, y: (pair.w + 1) / (size + 1) }]); const links = result.pairs.map((pair, i) => [i * 2, i * 2 + 1]); return { points, links, metrics: { items: size, score: result.pairs.length, extra: result.proposals, verified: stable(result) } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, match, stable };
}());
