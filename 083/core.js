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

  function simulate(kp, ki, kd, steps) {
    let position = 0;
    let velocity = 0;
    let integral = 0;
    let previousError = 1;
    const series = [];
    for (let step = 0; step < steps; step += 1) {
      const error = 1 - position;
      integral += error * 0.05;
      const derivative = (error - previousError) / 0.05;
      const force = kp * error + ki * integral + kd * derivative;
      velocity += (force - velocity * 0.42) * 0.05;
      position += velocity * 0.05;
      previousError = error;
      series.push(position);
    }
    return series;
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 83);
    const steps = clamp(Math.floor(((options && options.size) || 420) / 2), 90, 360);
    const kp = 2 + (seed % 3) * 0.04;
    const ki = 0.24;
    const kd = 1.8;
    const controlled = simulate(kp, ki, kd, steps);
    const finalError = Math.abs(1 - controlled[controlled.length - 1]);
    const overshoot = Math.max(0, Math.max(...controlled) - 1);
    return {
      points: controlled.slice(0, 160).map((value, index) => ({ x: index / 159, y: clamp(1 - value * 0.72, 0.02, 0.98), r: 3 })),
      links: [],
      path: [],
      series: controlled.slice(-28),
      metrics: {
        items: controlled.length,
        score: Number(finalError.toFixed(4)),
        extra: Number(overshoot.toFixed(4)),
        verified: finalError < 0.04 && overshoot < 0.22,
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

  window.ProjectCore = { analyze, benchmark, simulate };
}());
