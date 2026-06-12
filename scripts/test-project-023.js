const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '023', 'prob-core.js');
function fail(message) { throw new Error(message); }
const context = vm.createContext({ window: {}, Math, Date, Uint8Array });
vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, { filename: path.relative(rootDir, corePath) });
const ProbCore = context.window.ProbCore;

const a = ProbCore.analyze({ count: 3000, bloomSize: 12000, precision: 9, seed: 2301, probes: 1500 });
const b = ProbCore.analyze({ count: 3000, bloomSize: 12000, precision: 9, seed: 2301, probes: 1500 });

if (JSON.stringify(a.metrics) !== JSON.stringify(b.metrics)) fail('Probabilistic analysis should be deterministic for the same seed');
['uniqueCount', 'bloomFill', 'falsePositiveRate', 'hllEstimate', 'hllError', 'memoryBytes'].forEach((metric) => {
  const value = a.metrics[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Metric ${metric} must be finite`);
});
if (a.metrics.uniqueCount <= 2000 || a.metrics.bloomFill <= 0.2 || a.metrics.bloomFill >= 0.95) fail('Bloom filter should have meaningful load');
if (a.metrics.falsePositiveRate > 0.12) fail(`False positive rate too high: ${a.metrics.falsePositiveRate}`);
if (a.metrics.hllError > 0.18) fail(`HLL estimate error too high: ${a.metrics.hllError}`);

console.log(`Project 023 test passed: ${a.metrics.uniqueCount} unique, HLL error ${(a.metrics.hllError * 100).toFixed(1)}%, FP ${(a.metrics.falsePositiveRate * 100).toFixed(2)}%`);
