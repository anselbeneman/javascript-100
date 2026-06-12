(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createRng(seed) {
    let state = (seed >>> 0) || 1;
    return function rng() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function makeNumbers(options) {
    const seed = Math.floor(options.seed || 85);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const rng = createRng(seed);
    return Array.from({ length: clamp(Math.floor(size / 3), 64, 420) }, (_, index) => (
      Math.floor(rng() * 1000000) ^ (index * 2654435761)
    ) >>> 0);
  }

  function radixSort(values) {
    let output = values.slice();
    const buffer = Array(output.length);
    for (let shift = 0; shift < 32; shift += 8) {
      const counts = Array(256).fill(0);
      output.forEach((value) => { counts[(value >>> shift) & 255] += 1; });
      let total = 0;
      for (let i = 0; i < counts.length; i += 1) {
        const count = counts[i];
        counts[i] = total;
        total += count;
      }
      output.forEach((value) => {
        const bucket = (value >>> shift) & 255;
        buffer[counts[bucket]] = value;
        counts[bucket] += 1;
      });
      output = buffer.slice();
    }
    return output;
  }

  function analyze(options) {
    const values = makeNumbers(options || {});
    const sorted = radixSort(values);
    const verified = sorted.every((value, index) => index === 0 || sorted[index - 1] <= value)
      && sorted.join('|') === values.slice().sort((a, b) => a - b).join('|');
    return {
      points: sorted.slice(0, 180).map((value, index) => ({ x: index / 179, y: 1 - (value % 1000000) / 1000000, r: 2.8 })),
      links: [],
      path: [],
      series: sorted.slice(0, 28).map((value) => value % 1000),
      metrics: { items: values.length, score: sorted[0], extra: sorted[sorted.length - 1], verified },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, makeNumbers, radixSort };
}());
