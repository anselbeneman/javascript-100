const fs = require('fs');
const path = require('path');
const vm = require('vm');
const rootDir = process.cwd();
const corePath = path.join(rootDir, '025', 'regex-core.js');
function fail(message) { throw new Error(message); }
const context = vm.createContext({ window: {}, Math, Date });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const RegexCore = context.window.RegexCore;
const analysis = RegexCore.analyze({ pattern: '(a|b)*abb', input: 'aababb' });
const reject = RegexCore.analyze({ pattern: '(a|b)*abb', input: 'aababa' });
if (!analysis.result.matched) fail('Expected regex to match aababb');
if (reject.result.matched) fail('Expected regex to reject aababa');
['states', 'edges', 'epsilonEdges', 'traceSteps'].forEach((metric) => {
  const value = analysis.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Metric ${metric} must be finite`);
});
if (analysis.metrics.states < 10 || analysis.metrics.epsilonEdges < 4) fail('NFA should contain non-trivial automaton structure');
console.log(`Project 025 test passed: ${analysis.metrics.states} states, ${analysis.metrics.edges} edges`);
