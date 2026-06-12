const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '032', 'fft-core.js');
const context = vm.createContext({
  window: {},
  Math,
  Float64Array,
  performance: { now: () => Date.now() },
});

vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });

const { FftCore } = context.window;
const result = FftCore.analyze({ base: 256, second: 640, third: 960, mix: 0.55 });
const peakFrequencies = result.peaks.map((peak) => Math.round(peak.hz));

if (!peakFrequencies.includes(256) || !peakFrequencies.includes(640)) {
  throw new Error(`Expected 256 Hz and 640 Hz peaks, received ${peakFrequencies.join(', ')}`);
}

if (result.metrics.binCount !== 256 || result.metrics.rms <= 0.7) {
  throw new Error(`Invalid FFT metrics: ${JSON.stringify(result.metrics)}`);
}

const benchmark = FftCore.benchmark({ runs: 8 });
if (!Number.isFinite(benchmark.avgMs) || benchmark.binCount !== 256) {
  throw new Error('Benchmark returned invalid FFT metrics');
}

console.log(`Project 032 test passed: peaks ${peakFrequencies.slice(0, 4).join(', ')} Hz`);
