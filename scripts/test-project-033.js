const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '033', 'huffman-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Map,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { HuffmanCore } = context.window;
const result = HuffmanCore.analyze({ sample: 'telemetry' });

if (!result.metrics.decodedMatches) {
  throw new Error('Huffman decoded text did not match input');
}

if (result.metrics.ratio >= 0.78 || result.metrics.uniqueSymbols < 12) {
  throw new Error(`Weak compression evidence: ratio ${result.metrics.ratio}, unique ${result.metrics.uniqueSymbols}`);
}

const benchmark = HuffmanCore.benchmark({ runs: 9 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.uniqueSymbols < 10) {
  throw new Error('Benchmark returned invalid Huffman metrics');
}

console.log(`Project 033 test passed: ${result.metrics.encodedBits} bits, ${(result.metrics.ratio * 100).toFixed(1)}% ratio`);
