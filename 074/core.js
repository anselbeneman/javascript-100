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

  function generateSignal(options) {
    const seed = Math.floor(options.seed || 74);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const rng = createRng(seed);
    const count = clamp(Math.floor(size / 4), 60, 260);
    return Array.from({ length: count }, (_, index) => {
      const t = index / 18;
      const truth = 0.5 + Math.sin(t) * 0.28 + Math.cos(t * 0.37) * 0.11;
      const observed = truth + (rng() - 0.5) * 0.36;
      return { truth, observed };
    });
  }

  function filterSignal(samples) {
    let estimate = samples[0].observed;
    let covariance = 1;
    const processNoise = 0.008;
    const measurementNoise = 0.045;
    return samples.map((sample) => {
      covariance += processNoise;
      const gain = covariance / (covariance + measurementNoise);
      estimate += gain * (sample.observed - estimate);
      covariance *= 1 - gain;
      return estimate;
    });
  }

  function rmse(values, truth) {
    const error = values.reduce((sum, value, index) => sum + (value - truth[index]) ** 2, 0) / values.length;
    return Math.sqrt(error);
  }

  function analyze(options) {
    const samples = generateSignal(options || {});
    const filtered = filterSignal(samples);
    const truth = samples.map((sample) => sample.truth);
    const rawError = rmse(samples.map((sample) => sample.observed), truth);
    const filteredError = rmse(filtered, truth);
    return {
      points: samples.slice(0, 120).map((sample, index) => ({ x: index / 119, y: 1 - sample.observed, r: 3, outlier: Math.abs(sample.observed - sample.truth) > 0.12 })),
      links: [],
      path: [],
      series: filtered.slice(0, 28),
      metrics: {
        items: samples.length,
        score: Number(filteredError.toFixed(4)),
        extra: Number(rawError.toFixed(4)),
        verified: filteredError < rawError * 0.72,
      },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) {
      analyze(options);
    }
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, filterSignal, generateSignal };
}());
