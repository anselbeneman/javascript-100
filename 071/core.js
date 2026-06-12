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

  function makeText(options) {
    const seed = Math.floor(options.seed || 71);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const words = ['vector', 'canvas', 'worker', 'signal', 'matrix', 'packet', 'runtime', 'index'];
    const parts = [];
    for (let i = 0; i < size; i += 1) {
      parts.push(words[(i * 7 + seed + (i % 5)) % words.length]);
      if (i % 9 === 0) parts.push(words[(seed + 2) % words.length]);
    }
    return parts.join('|');
  }

  function compress(input) {
    const dict = new Map();
    for (let i = 0; i < 256; i += 1) dict.set(String.fromCharCode(i), i);
    let phrase = '';
    let nextCode = 256;
    const output = [];
    for (const char of input) {
      const joined = phrase + char;
      if (dict.has(joined)) {
        phrase = joined;
      } else {
        output.push(dict.get(phrase));
        dict.set(joined, nextCode);
        nextCode += 1;
        phrase = char;
      }
    }
    if (phrase) output.push(dict.get(phrase));
    return { codes: output, dictionarySize: nextCode };
  }

  function decompress(codes) {
    const dict = new Map();
    for (let i = 0; i < 256; i += 1) dict.set(i, String.fromCharCode(i));
    let nextCode = 256;
    let previous = dict.get(codes[0]);
    let output = previous;
    for (let i = 1; i < codes.length; i += 1) {
      const code = codes[i];
      const entry = dict.has(code) ? dict.get(code) : previous + previous[0];
      output += entry;
      dict.set(nextCode, previous + entry[0]);
      nextCode += 1;
      previous = entry;
    }
    return output;
  }

  function analyze(options) {
    const text = makeText(options || {});
    const packed = compress(text);
    const restored = decompress(packed.codes);
    const ratio = packed.codes.length / text.length;
    const buckets = new Map();
    for (const char of text) buckets.set(char, (buckets.get(char) || 0) + 1);
    const series = [...buckets.values()].slice(0, 28);
    return {
      points: series.map((value, index) => ({ x: (index + 1) / (series.length + 1), y: 1 - value / Math.max(...series), r: 5 })),
      links: [],
      path: packed.codes.slice(0, 24).map((_, index) => index),
      series,
      metrics: {
        items: text.length,
        score: Number((ratio * 100).toFixed(2)),
        extra: packed.dictionarySize,
        verified: restored === text && ratio < 0.55,
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

  window.ProjectCore = { analyze, benchmark, compress, decompress };
}());
