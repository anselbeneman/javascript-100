const fs = require('fs');
const path = require('path');
const vm = require('vm');
const rootDir = process.cwd();
const corePath = path.join(rootDir, '027', 'parser-core.js');
function fail(message) { throw new Error(message); }
const context = vm.createContext({ window: {}, Math, Date });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const ParserCore = context.window.ParserCore;
const result = ParserCore.analyze({ source: '3 + 4 * 2 / (1 - 5)^2^3' });
if (Math.abs(result.value - 3.0001220703125) > 1e-10) fail(`Unexpected Pratt evaluation: ${result.value}`);
['tokens', 'nodes', 'depth', 'value'].forEach((metric) => {
  const value = result.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Metric ${metric} must be finite`);
});
if (result.metrics.nodes < 10 || result.metrics.depth < 5) fail('AST should be non-trivial');
console.log(`Project 027 test passed: ${result.metrics.tokens} tokens, ${result.metrics.nodes} AST nodes, value ${result.value}`);
