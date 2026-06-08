(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function index2D(x, y, size) {
    return y * size + x;
  }

  function parseHexColor(value, fallback = '#070806') {
    const raw = String(value || fallback).replace('#', '').trim();
    const safe = /^[0-9a-f]{6}$/i.test(raw)
      ? raw
      : String(fallback).replace('#', '').trim();
    const color = Number.parseInt(safe, 16);

    return [
      (color >> 16) & 255,
      (color >> 8) & 255,
      color & 255,
    ];
  }

  function obstacleDistanceAt(x, y, size) {
    const nx = x / (size - 1) - 0.5;
    const ny = y / (size - 1) - 0.52;

    return Math.hypot(nx, ny);
  }

  function percentile(sortedValues, percentileValue) {
    if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
      return 0;
    }

    const position = (sortedValues.length - 1) * percentileValue;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const ratio = position - lower;
    return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio;
  }

  function buildTimingHistogram(samples) {
    const buckets = [
      { label: '0-4 ms', min: 0, max: 4, count: 0 },
      { label: '4-8 ms', min: 4, max: 8, count: 0 },
      { label: '8-16 ms', min: 8, max: 16, count: 0 },
      { label: '16-33 ms', min: 16, max: 33, count: 0 },
      { label: '33-50 ms', min: 33, max: 50, count: 0 },
      { label: '50+ ms', min: 50, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    samples.forEach((sample) => {
      const bucket = buckets.find((entry) => sample >= entry.min && sample < entry.max) || buckets[buckets.length - 1];
      bucket.count += 1;
    });

    return buckets.map(({ label, count }) => ({ label, count }));
  }

  function summarizeStepTimings(samples) {
    const sorted = samples.slice().sort((a, b) => a - b);
    const count = sorted.length;
    const total = samples.reduce((sum, value) => sum + value, 0);
    const avg = count > 0 ? total / count : 0;
    const variance = count > 0
      ? samples.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / count
      : 0;
    const stdDev = Math.sqrt(variance);
    const p95 = percentile(sorted, 0.95);
    const jitterRatio = avg > 0 ? stdDev / avg : 0;

    return {
      totalStepMs: total,
      avgStepMs: avg,
      medianStepMs: percentile(sorted, 0.5),
      p95StepMs: p95,
      worstStepMs: count > 0 ? sorted[count - 1] : 0,
      stdDevStepMs: stdDev,
      stabilityScore: clamp(100 - jitterRatio * 55, 0, 100),
      histogram: buildTimingHistogram(samples),
    };
  }

  function hsvToRgb(hue, saturation, value) {
    const h = ((hue % 1) + 1) % 1;
    const c = value * saturation;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = value - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 1 / 6) {
      r = c;
      g = x;
    } else if (h < 2 / 6) {
      r = x;
      g = c;
    } else if (h < 3 / 6) {
      g = c;
      b = x;
    } else if (h < 4 / 6) {
      g = x;
      b = c;
    } else if (h < 5 / 6) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    return [
      (r + m) * 255,
      (g + m) * 255,
      (b + m) * 255,
    ];
  }

  function buildObstacleMask(size, options = {}) {
    const radius = Number.isFinite(options.radius) ? options.radius : 0.132;
    const innerRim = Number.isFinite(options.innerRim) ? options.innerRim : 0.118;
    const feather = Number.isFinite(options.feather) ? options.feather : 0.022;
    const count = size * size;
    const solid = new Uint8Array(count);
    const fade = new Float32Array(count);
    const rim = new Uint8Array(count);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = index2D(x, y, size);
        const distance = obstacleDistanceAt(x, y, size);
        const isSolid = distance < radius;

        solid[i] = isSolid ? 1 : 0;
        rim[i] = isSolid && distance > innerRim ? 1 : 0;

        if (distance < radius) {
          fade[i] = 0;
        } else if (distance < radius + feather) {
          fade[i] = clamp((distance - radius) / feather, 0, 1);
        } else {
          fade[i] = 1;
        }
      }
    }

    return { solid, fade, rim };
  }

  const api = Object.freeze({
    buildObstacleMask,
    buildTimingHistogram,
    clamp,
    hsvToRgb,
    index2D,
    obstacleDistanceAt,
    parseHexColor,
    percentile,
    summarizeStepTimings,
  });
  const target = typeof self !== 'undefined' ? self : window;

  target.FluidCoreTools = api;
  if (typeof window !== 'undefined') {
    window.FluidCoreTools = api;
  }
}());
