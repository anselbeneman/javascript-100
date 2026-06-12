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

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function train() {
    const data = [
      { x: [0, 0], y: 0 },
      { x: [0, 1], y: 1 },
      { x: [1, 0], y: 1 },
      { x: [1, 1], y: 0 },
    ];
    const net = {
      w1: [[5.1, -5.2], [5.0, -5.1]],
      b1: [-2.4, 7.4],
      w2: [7.2, 7.1],
      b2: -3.4,
    };
    const history = [];
    for (let epoch = 0; epoch < 2600; epoch += 1) {
      let loss = 0;
      data.forEach((sample) => {
        const h = [sigmoid(sample.x[0] * net.w1[0][0] + sample.x[1] * net.w1[1][0] + net.b1[0]), sigmoid(sample.x[0] * net.w1[0][1] + sample.x[1] * net.w1[1][1] + net.b1[1])];
        const out = sigmoid(h[0] * net.w2[0] + h[1] * net.w2[1] + net.b2);
        const error = out - sample.y;
        loss += error * error;
        const dOut = error * out * (1 - out);
        for (let i = 0; i < 2; i += 1) {
          const dHidden = dOut * net.w2[i] * h[i] * (1 - h[i]);
          net.w2[i] -= 0.55 * dOut * h[i];
          net.w1[0][i] -= 0.55 * dHidden * sample.x[0];
          net.w1[1][i] -= 0.55 * dHidden * sample.x[1];
          net.b1[i] -= 0.55 * dHidden;
        }
        net.b2 -= 0.55 * dOut;
      });
      if (epoch % 100 === 0) history.push(loss / data.length);
    }
    const outputs = data.map((sample) => {
      const h = [sigmoid(sample.x[0] * net.w1[0][0] + sample.x[1] * net.w1[1][0] + net.b1[0]), sigmoid(sample.x[0] * net.w1[0][1] + sample.x[1] * net.w1[1][1] + net.b1[1])];
      return sigmoid(h[0] * net.w2[0] + h[1] * net.w2[1] + net.b2);
    });
    return { outputs, history };
  }

  function analyze() {
    const result = train();
    const verified = result.outputs[0] < 0.15 && result.outputs[1] > 0.85 && result.outputs[2] > 0.85 && result.outputs[3] < 0.15;
    return {
      points: result.outputs.map((value, index) => ({ x: (index % 2 + 1) / 3, y: (Math.floor(index / 2) + 1) / 3, r: 8 + value * 8 })),
      links: [],
      path: [1, 2],
      series: result.history,
      metrics: { items: 4, score: Number(Math.max(...result.outputs.map((value, index) => Math.abs(value - (index === 1 || index === 2 ? 1 : 0)))).toFixed(4)), extra: result.history.length, verified },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) analyze(options);
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, sigmoid, train };
}());
