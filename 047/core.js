(function () {
  'use strict';
  const words = 'project performance parser particle pathfinding portfolio polygon procedural probability prefix quadtree query quick render router ray regression responsive route scheduler search signal simulation solver spectrum spatial tree trie worker'.split(' ');
  function node() { return { children: new Map(), terminal: false, score: 0 }; }
  function insert(root, word, score) { let current = root; for (const char of word) { if (!current.children.has(char)) current.children.set(char, node()); current = current.children.get(char); } current.terminal = true; current.score = score; }
  function build(size) { const root = node(); words.slice(0, Math.min(words.length, size)).forEach((word, index) => insert(root, word, words.length - index)); return root; }
  function find(root, prefix) { let current = root; for (const char of prefix) { current = current.children.get(char); if (!current) return null; } return current; }
  function collect(root, prefix, out) { if (root.terminal) out.push({ word: prefix, score: root.score }); root.children.forEach((child, char) => collect(child, prefix + char, out)); return out; }
  function count(root) { let total = 1; root.children.forEach((child) => { total += count(child); }); return total; }
  function analyze(options) { const size = Math.max(12, Math.floor(options.size || 28)); const root = build(size); const suggestions = collect(find(root, 'pro') || node(), 'pro', []).sort((a, b) => b.score - a.score); const series = suggestions.map((item) => item.score); return { series, metrics: { items: size, score: suggestions.length, extra: count(root), verified: suggestions.some((item) => item.word === 'project') } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, build, collect, count, find, insert };
}());
