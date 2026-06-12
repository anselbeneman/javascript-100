(function () {
  'use strict';
  const corpus = 'javascript canvas render javascript worker render javascript graph search canvas graph route canvas worker data project data graph parser data signal parser canvas geometry tree geometry graph index search route cache search parser portfolio client portfolio responsive client performance validation performance metrics validation';
  function tokenize(text) { return text.toLowerCase().split(/\s+/).filter(Boolean); }
  function build(tokens) {
    const transitions = new Map();
    for (let i = 0; i < tokens.length - 1; i += 1) {
      if (!transitions.has(tokens[i])) transitions.set(tokens[i], new Map());
      const row = transitions.get(tokens[i]);
      row.set(tokens[i + 1], (row.get(tokens[i + 1]) || 0) + 1);
    }
    return transitions;
  }
  function entropy(transitions) {
    let total = 0;
    let h = 0;
    transitions.forEach((row) => {
      const rowTotal = [...row.values()].reduce((a, b) => a + b, 0);
      row.forEach((count) => {
        const p = count / rowTotal;
        h -= p * Math.log2(p);
        total += count;
      });
    });
    return total ? h / transitions.size : 0;
  }
  function analyze(options) {
    const size = Math.max(20, Math.floor(options.size || 80));
    const tokens = tokenize(Array(Math.ceil(size / 20)).fill(corpus).join(' '));
    const transitions = build(tokens);
    const keys = [...transitions.keys()];
    const series = keys.slice(0, 32).map((key) => transitions.get(key).size);
    return { series, metrics: { items: transitions.size, score: entropy(transitions), extra: tokens.length, verified: transitions.has('javascript') && transitions.has('canvas') } };
  }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); let score = 0; for (let i = 0; i < runs; i += 1) score += analyze(options).metrics.score; return { runs, avgMs: (performance.now() - start) / runs, score: score / runs }; }
  window.ProjectCore = { analyze, benchmark, build, entropy, tokenize };
}());
