(function () {
  'use strict';

  function bitReverse(value, bits) {
    let reversed = 0;
    for (let index = 0; index < bits; index += 1) {
      reversed = (reversed << 1) | (value & 1);
      value >>= 1;
    }
    return reversed;
  }

  function hann(index, size) {
    return 0.5 * (1 - Math.cos(2 * Math.PI * index / Math.max(1, size - 1)));
  }

  function generateSignal(options = {}) {
    const sampleRate = options.sampleRate || 4096;
    const size = options.size || 512;
    const base = options.base || 256;
    const second = options.second || 640;
    const third = options.third || 960;
    const mix = Number.isFinite(options.mix) ? options.mix : 0.5;
    const samples = new Float64Array(size);

    for (let index = 0; index < size; index += 1) {
      const t = index / sampleRate;
      samples[index] = Math.sin(2 * Math.PI * base * t)
        + Math.sin(2 * Math.PI * second * t) * mix
        + Math.sin(2 * Math.PI * third * t) * 0.28
        + Math.sin(2 * Math.PI * (base * 0.5) * t) * 0.12;
    }

    return { sampleRate, samples };
  }

  function fft(samples) {
    const size = samples.length;
    const bits = Math.log2(size);
    if (Math.floor(bits) !== bits) {
      throw new Error('FFT size must be a power of two');
    }

    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    for (let index = 0; index < size; index += 1) {
      real[bitReverse(index, bits)] = samples[index] * hann(index, size);
    }

    for (let length = 2; length <= size; length *= 2) {
      const angle = -2 * Math.PI / length;
      const wLengthReal = Math.cos(angle);
      const wLengthImag = Math.sin(angle);

      for (let start = 0; start < size; start += length) {
        let wReal = 1;
        let wImag = 0;

        for (let offset = 0; offset < length / 2; offset += 1) {
          const even = start + offset;
          const odd = even + length / 2;
          const oddReal = real[odd] * wReal - imag[odd] * wImag;
          const oddImag = real[odd] * wImag + imag[odd] * wReal;
          real[odd] = real[even] - oddReal;
          imag[odd] = imag[even] - oddImag;
          real[even] += oddReal;
          imag[even] += oddImag;

          const nextReal = wReal * wLengthReal - wImag * wLengthImag;
          wImag = wReal * wLengthImag + wImag * wLengthReal;
          wReal = nextReal;
        }
      }
    }

    return { real, imag };
  }

  function spectrum(transform, sampleRate) {
    const size = transform.real.length;
    const bins = [];
    for (let index = 0; index < size / 2; index += 1) {
      const magnitude = Math.hypot(transform.real[index], transform.imag[index]) / size;
      bins.push({
        bin: index,
        hz: index * sampleRate / size,
        magnitude,
      });
    }
    return bins;
  }

  function dominantPeaks(bins, count = 5) {
    return bins
      .filter((bin) => bin.bin > 0)
      .slice()
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, count)
      .sort((a, b) => a.hz - b.hz);
  }

  function analyze(options = {}) {
    const signal = generateSignal(options);
    const transform = fft(signal.samples);
    const bins = spectrum(transform, signal.sampleRate);
    const peaks = dominantPeaks(bins, 6);
    const rms = Math.sqrt(signal.samples.reduce((sum, value) => sum + value * value, 0) / signal.samples.length);

    return {
      sampleRate: signal.sampleRate,
      samples: Array.from(signal.samples),
      bins,
      peaks,
      metrics: {
        sampleCount: signal.samples.length,
        binCount: bins.length,
        rms,
        peakHz: peaks[0] ? peaks[0].hz : 0,
        peakMagnitude: peaks[0] ? peaks[0].magnitude : 0,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(100, Math.floor(options.runs || 24)));
    const started = performance.now();
    let last = null;
    for (let index = 0; index < runs; index += 1) {
      last = analyze({ ...options, base: (options.base || 256) + (index % 4) * 16 });
    }
    return { runs, avgMs: (performance.now() - started) / runs, peakHz: last.metrics.peakHz, binCount: last.metrics.binCount };
  }

  window.FftCore = {
    analyze,
    benchmark,
    bitReverse,
    dominantPeaks,
    fft,
    generateSignal,
    hann,
    spectrum,
  };
}());
