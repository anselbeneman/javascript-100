(function attachKalmanCore(global) {
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

  function makeNormal(seed) {
    const random = makeRng(seed);
    let spare = null;

    return function normal() {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }

      const u = Math.max(random(), 1e-9);
      const v = Math.max(random(), 1e-9);
      const radius = Math.sqrt(-2 * Math.log(u));
      const theta = Math.PI * 2 * v;
      spare = radius * Math.sin(theta);
      return radius * Math.cos(theta);
    };
  }

  function simulateTrack(options = {}) {
    const steps = clamp(Math.round(options.steps || 180), 36, 520);
    const noise = clamp(Number(options.noise || 0.07), 0.005, 0.2);
    const seed = options.seed || 14;
    const normal = makeNormal(seed);
    const dt = Number(options.dt || 1 / 24);
    const truth = [];
    const measurements = [];
    let x = 0.16;
    let y = 0.62;
    let vx = 0.42;
    let vy = -0.18;

    for (let index = 0; index < steps; index += 1) {
      const t = index * dt;
      const ax = Math.sin(t * 5.8) * 0.06 + Math.cos(t * 1.7) * 0.022;
      const ay = Math.cos(t * 4.3) * 0.05 - Math.sin(t * 2.1) * 0.018;

      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;

      if (x < 0.08 || x > 0.92) {
        vx *= -0.78;
        x = clamp(x, 0.08, 0.92);
      }

      if (y < 0.08 || y > 0.92) {
        vy *= -0.78;
        y = clamp(y, 0.08, 0.92);
      }

      const point = { x, y, vx, vy, t };
      truth.push(point);
      measurements.push({
        x: clamp(x + normal() * noise, 0.02, 0.98),
        y: clamp(y + normal() * noise, 0.02, 0.98),
        t,
      });
    }

    return {
      dt,
      noise,
      seed,
      truth,
      measurements,
    };
  }

  function createAxisFilter(position, options) {
    return {
      position,
      velocity: 0,
      p00: Number(options.initialPositionVariance || 0.08),
      p01: 0,
      p10: 0,
      p11: Number(options.initialVelocityVariance || 0.12),
    };
  }

  function predictAxis(axis, dt, processNoise) {
    axis.position += axis.velocity * dt;

    const p00 = axis.p00 + dt * (axis.p10 + axis.p01) + dt * dt * axis.p11 + processNoise;
    const p01 = axis.p01 + dt * axis.p11;
    const p10 = axis.p10 + dt * axis.p11;
    const p11 = axis.p11 + processNoise * 0.22;

    axis.p00 = p00;
    axis.p01 = p01;
    axis.p10 = p10;
    axis.p11 = p11;
  }

  function updateAxis(axis, measurement, measurementNoise) {
    const innovation = measurement - axis.position;
    const s = axis.p00 + measurementNoise;
    const k0 = axis.p00 / s;
    const k1 = axis.p10 / s;

    axis.position += k0 * innovation;
    axis.velocity += k1 * innovation;

    const p00 = (1 - k0) * axis.p00;
    const p01 = (1 - k0) * axis.p01;
    const p10 = axis.p10 - k1 * axis.p00;
    const p11 = axis.p11 - k1 * axis.p01;

    axis.p00 = Math.max(p00, 1e-9);
    axis.p01 = p01;
    axis.p10 = p10;
    axis.p11 = Math.max(p11, 1e-9);

    return {
      innovation,
      gainPosition: k0,
      gainVelocity: k1,
    };
  }

  function runFilter(track, options = {}) {
    const dt = track.dt || Number(options.dt || 1 / 24);
    const measurementNoise = Math.pow(clamp(Number(options.measurementNoise || track.noise || 0.07), 0.002, 0.4), 2);
    const processNoise = Math.pow(clamp(Number(options.processNoise || 0.018), 0.0005, 0.18), 2);
    const first = track.measurements[0];
    const xAxis = createAxisFilter(first.x, options);
    const yAxis = createAxisFilter(first.y, options);
    const filtered = [];
    const residuals = [];

    track.measurements.forEach((measurement, index) => {
      if (index > 0) {
        predictAxis(xAxis, dt, processNoise);
        predictAxis(yAxis, dt, processNoise);
      }

      const rx = updateAxis(xAxis, measurement.x, measurementNoise);
      const ry = updateAxis(yAxis, measurement.y, measurementNoise);

      filtered.push({
        x: clamp(xAxis.position, 0, 1),
        y: clamp(yAxis.position, 0, 1),
        vx: xAxis.velocity,
        vy: yAxis.velocity,
        pxx: xAxis.p00,
        pyy: yAxis.p00,
        gain: (rx.gainPosition + ry.gainPosition) * 0.5,
        t: measurement.t,
      });

      residuals.push(Math.sqrt(rx.innovation * rx.innovation + ry.innovation * ry.innovation));
    });

    return {
      filtered,
      residuals,
      options: {
        processNoise,
        measurementNoise,
      },
    };
  }

  function rmse(reference, candidate) {
    const count = Math.min(reference.length, candidate.length);
    let sum = 0;

    for (let index = 0; index < count; index += 1) {
      const dx = reference[index].x - candidate[index].x;
      const dy = reference[index].y - candidate[index].y;
      sum += dx * dx + dy * dy;
    }

    return count ? Math.sqrt(sum / count) : 0;
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function summarize(options = {}) {
    const track = simulateTrack(options);
    const filter = runFilter(track, options);
    const measurementRmse = rmse(track.truth, track.measurements);
    const filteredRmse = rmse(track.truth, filter.filtered);

    return {
      track,
      filter,
      metrics: {
        measurementRmse,
        filteredRmse,
        improvement: measurementRmse > 0 ? (measurementRmse - filteredRmse) / measurementRmse : 0,
        averageResidual: average(filter.residuals),
        finalGain: filter.filtered.length ? filter.filtered[filter.filtered.length - 1].gain : 0,
        steps: track.truth.length,
      },
    };
  }

  function benchmarkFilter(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 80), 1, 320);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 14) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkFilter,
    makeRng,
    rmse,
    runFilter,
    simulateTrack,
    summarize,
  };

  global.KalmanCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
