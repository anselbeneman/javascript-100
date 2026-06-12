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

  function encodeNibble(value) {
    const d1 = (value >> 3) & 1;
    const d2 = (value >> 2) & 1;
    const d3 = (value >> 1) & 1;
    const d4 = value & 1;
    const p1 = d1 ^ d2 ^ d4;
    const p2 = d1 ^ d3 ^ d4;
    const p3 = d2 ^ d3 ^ d4;
    return [p1, p2, d1, p3, d2, d3, d4];
  }

  function decodeWord(bits) {
    const syndrome = (bits[0] ^ bits[2] ^ bits[4] ^ bits[6])
      + ((bits[1] ^ bits[2] ^ bits[5] ^ bits[6]) << 1)
      + ((bits[3] ^ bits[4] ^ bits[5] ^ bits[6]) << 2);
    const corrected = bits.slice();
    if (syndrome > 0) corrected[syndrome - 1] ^= 1;
    const value = (corrected[2] << 3) | (corrected[4] << 2) | (corrected[5] << 1) | corrected[6];
    return { value, syndrome };
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 81);
    const results = [];
    for (let value = 0; value < 16; value += 1) {
      for (let error = 0; error < 7; error += 1) {
        const encoded = encodeNibble(value);
        encoded[error] ^= 1;
        const decoded = decodeWord(encoded);
        results.push({ value, error, decoded });
      }
    }
    const failures = results.filter((item) => item.decoded.value !== item.value);
    return {
      points: results.slice(0, 112).map((item, index) => ({ x: (index % 16) / 15, y: Math.floor(index / 16) / 7, r: item.decoded.syndrome ? 4.5 : 3 })),
      links: [],
      path: [],
      series: results.slice(0, 28).map((item) => item.decoded.syndrome + seed * 0),
      metrics: {
        items: results.length,
        score: failures.length,
        extra: 7,
        verified: failures.length === 0,
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

  window.ProjectCore = { analyze, benchmark, decodeWord, encodeNibble };
}());
