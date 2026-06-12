const fs = require('fs');
const path = require('path');
const vm = require('vm');
const rootDir = process.cwd();
const corePath = path.join(rootDir, '026', 'search-core.js');
function fail(message) { throw new Error(message); }
const context = vm.createContext({ window: {}, Math, Date, Map, Set });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const SearchCore = context.window.SearchCore;
const result = SearchCore.analyze({ query: 'procedural rendering geometry' });
if (result.results.length < 1) fail('Search should return at least one result');
if (!result.results[0].text.includes('sdf ray marcher')) fail(`Expected SDF ray marcher as top rendering result, got ${result.results[0].text}`);
['documents', 'vocabulary', 'avgLength', 'queryTerms', 'hits', 'topScore'].forEach((metric) => {
  const value = result.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Metric ${metric} must be finite`);
});
if (result.metrics.vocabulary < 50 || result.metrics.topScore <= 0) fail('Index metrics should be non-trivial');
console.log(`Project 026 test passed: ${result.metrics.documents} docs, ${result.metrics.vocabulary} terms, top score ${result.metrics.topScore.toFixed(3)}`);
