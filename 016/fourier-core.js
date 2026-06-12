(function attachFourierCore(global) {
  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function makeRng(seed) {
    let state = (seed >>> 0) || 1;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function createPath(options = {}) {
    const count = clamp(Math.round(options.count || 192), 48, 420);
    const preset = options.preset || 'orbit';
    const random = makeRng(options.seed || 16);
    const points = [];

    for (let index = 0; index < count; index += 1) {
      const t = index / count;
      const a = TAU * t;
      let x = 0;
      let y = 0;

      if (preset === 'rose') {
        const radius = 0.58 * Math.cos(5 * a) + 0.18 * Math.sin(2 * a);
        x = radius * Math.cos(a);
        y = radius * Math.sin(a);
      } else if (preset === 'lissajous') {
        x = 0.58 * Math.sin(3 * a + 0.44) + 0.08 * Math.sin(11 * a);
        y = 0.48 * Math.sin(4 * a) + 0.14 * Math.cos(7 * a);
      } else if (preset === 'gear') {
        const radius = 0.42 + 0.11 * Math.sign(Math.sin(9 * a)) + 0.06 * Math.sin(17 * a);
        x = radius * Math.cos(a);
        y = radius * Math.sin(a);
      } else {
        const radius = 0.44 + 0.10 * Math.sin(3 * a + 0.2) + 0.08 * Math.cos(7 * a);
        x = radius * Math.cos(a) + 0.16 * Math.cos(2 * a);
        y = radius * Math.sin(a) - 0.11 * Math.sin(4 * a);
      }

      const jitter = Number(options.jitter || 0);
      if (jitter > 0) {
        x += (random() - 0.5) * jitter;
        y += (random() - 0.5) * jitter;
      }

      points.push({ x, y, t });
    }

    return points;
  }

  function coefficientFrequency(index, count) {
    return index <= count / 2 ? index : index - count;
  }

  function discreteFourier(points) {
    const count = points.length;
    const coefficients = [];

    for (let k = 0; k < count; k += 1) {
      let real = 0;
      let imaginary = 0;

      for (let n = 0; n < count; n += 1) {
        const angle = -TAU * k * n / count;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const point = points[n];

        real += point.x * cos - point.y * sin;
        imaginary += point.x * sin + point.y * cos;
      }

      real /= count;
      imaginary /= count;

      coefficients.push({
        frequency: coefficientFrequency(k, count),
        real,
        imaginary,
        amplitude: Math.sqrt(real * real + imaginary * imaginary),
        phase: Math.atan2(imaginary, real),
      });
    }

    return coefficients.sort((a, b) => b.amplitude - a.amplitude);
  }

  function reconstructPoint(coefficients, t, harmonicCount) {
    const limit = clamp(Math.round(harmonicCount || coefficients.length), 1, coefficients.length);
    let x = 0;
    let y = 0;
    const chain = [];

    for (let index = 0; index < limit; index += 1) {
      const coefficient = coefficients[index];
      const previous = { x, y };
      const angle = TAU * coefficient.frequency * t + coefficient.phase;
      x += coefficient.amplitude * Math.cos(angle);
      y += coefficient.amplitude * Math.sin(angle);
      chain.push({
        from: previous,
        to: { x, y },
        radius: coefficient.amplitude,
        frequency: coefficient.frequency,
      });
    }

    return { x, y, chain };
  }

  function reconstructPath(coefficients, count, harmonicCount) {
    const points = [];
    for (let index = 0; index < count; index += 1) {
      const point = reconstructPoint(coefficients, index / count, harmonicCount);
      points.push({ x: point.x, y: point.y, t: index / count });
    }
    return points;
  }

  function reconstructionError(source, coefficients, harmonicCount) {
    let sum = 0;

    for (let index = 0; index < source.length; index += 1) {
      const reconstructed = reconstructPoint(coefficients, index / source.length, harmonicCount);
      const dx = source[index].x - reconstructed.x;
      const dy = source[index].y - reconstructed.y;
      sum += dx * dx + dy * dy;
    }

    return Math.sqrt(sum / source.length);
  }

  function summarize(options = {}) {
    const points = createPath(options);
    const coefficients = discreteFourier(points);
    const harmonicCount = clamp(Math.round(options.harmonics || 28), 1, coefficients.length);
    const reconstructed = reconstructPath(coefficients, points.length, harmonicCount);
    const fullError = reconstructionError(points, coefficients, coefficients.length);
    const partialError = reconstructionError(points, coefficients, harmonicCount);
    const lowError = reconstructionError(points, coefficients, Math.max(3, Math.floor(harmonicCount / 3)));

    return {
      points,
      coefficients,
      reconstructed,
      metrics: {
        samples: points.length,
        harmonics: harmonicCount,
        dominantFrequency: coefficients[0] ? coefficients[0].frequency : 0,
        dominantAmplitude: coefficients[0] ? coefficients[0].amplitude : 0,
        partialError,
        lowError,
        fullError,
        compressionRatio: harmonicCount / points.length,
      },
    };
  }

  function benchmarkFourier(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 10), 1, 80);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 16) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkFourier,
    createPath,
    discreteFourier,
    makeRng,
    reconstructPath,
    reconstructPoint,
    reconstructionError,
    summarize,
  };

  global.FourierCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
