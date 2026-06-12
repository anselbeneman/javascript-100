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

  function fft(re, im, invert) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const angle = 2 * Math.PI / len * (invert ? -1 : 1);
      const wlenRe = Math.cos(angle);
      const wlenIm = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wRe = 1;
        let wIm = 0;
        for (let j = 0; j < len / 2; j += 1) {
          const uRe = re[i + j];
          const uIm = im[i + j];
          const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
          const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
          re[i + j] = uRe + vRe;
          im[i + j] = uIm + vIm;
          re[i + j + len / 2] = uRe - vRe;
          im[i + j + len / 2] = uIm - vIm;
          [wRe, wIm] = [wRe * wlenRe - wIm * wlenIm, wRe * wlenIm + wIm * wlenRe];
        }
      }
    }
    if (invert) for (let i = 0; i < n; i += 1) { re[i] /= n; im[i] /= n; }
  }

  function convolve(a, b) {
    let n = 1;
    while (n < a.length + b.length) n <<= 1;
    const aRe = Array(n).fill(0);
    const aIm = Array(n).fill(0);
    const bRe = Array(n).fill(0);
    const bIm = Array(n).fill(0);
    a.forEach((value, index) => { aRe[index] = value; });
    b.forEach((value, index) => { bRe[index] = value; });
    fft(aRe, aIm, false);
    fft(bRe, bIm, false);
    for (let i = 0; i < n; i += 1) {
      const real = aRe[i] * bRe[i] - aIm[i] * bIm[i];
      const imag = aRe[i] * bIm[i] + aIm[i] * bRe[i];
      aRe[i] = real;
      aIm[i] = imag;
    }
    fft(aRe, aIm, true);
    return aRe.slice(0, a.length + b.length - 1);
  }

  function direct(a, b) {
    const out = Array(a.length + b.length - 1).fill(0);
    a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; }));
    return out;
  }

  function analyze() {
    const a = Array.from({ length: 64 }, (_, index) => Math.sin(index * 0.21) + Math.cos(index * 0.07));
    const b = Array.from({ length: 32 }, (_, index) => Math.exp(-index / 10));
    const fast = convolve(a, b);
    const exact = direct(a, b);
    const maxError = Math.max(...fast.map((value, index) => Math.abs(value - exact[index])));
    return {
      points: fast.slice(0, 120).map((value, index) => ({ x: index / 119, y: clamp(0.5 - value / 70, 0.02, 0.98), r: 3 })),
      links: [],
      path: [],
      series: fast.slice(0, 28),
      metrics: { items: fast.length, score: Number(maxError.toExponential(3)), extra: exact.length, verified: maxError < 1e-8 },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, convolve, direct, fft };
}());
