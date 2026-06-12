(function () {
  'use strict';

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function createDataset(options = {}) {
    const count = Math.max(60, Math.min(800, Math.floor(options.count || 240)));
    const random = mulberry32(options.seed || 43);
    const margin = Number.isFinite(options.margin) ? options.margin : 0.12;
    return Array.from({ length: count }, () => {
      const x = random() * 2 - 1;
      const y = random() * 2 - 1;
      const noise = (random() - 0.5) * margin;
      const label = x * 1.35 + y * -0.92 + 0.18 + noise > 0 ? 1 : 0;
      return { x, y, label };
    });
  }

  function predict(model, sample) {
    return sigmoid(model.bias + model.wx * sample.x + model.wy * sample.y);
  }

  function evaluate(model, samples) {
    let loss = 0;
    let correct = 0;
    samples.forEach((sample) => {
      const p = Math.max(1e-7, Math.min(1 - 1e-7, predict(model, sample)));
      loss += -(sample.label * Math.log(p) + (1 - sample.label) * Math.log(1 - p));
      correct += (p >= 0.5 ? 1 : 0) === sample.label ? 1 : 0;
    });
    return { loss: loss / samples.length, accuracy: correct / samples.length };
  }

  function train(samples, options = {}) {
    const epochs = Math.max(10, Math.min(800, Math.floor(options.epochs || 220)));
    const learningRate = Number.isFinite(options.learningRate) ? options.learningRate : 0.85;
    const model = { wx: 0, wy: 0, bias: 0 };
    const history = [];

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      let dwx = 0;
      let dwy = 0;
      let db = 0;
      samples.forEach((sample) => {
        const error = predict(model, sample) - sample.label;
        dwx += error * sample.x;
        dwy += error * sample.y;
        db += error;
      });
      model.wx -= learningRate * dwx / samples.length;
      model.wy -= learningRate * dwy / samples.length;
      model.bias -= learningRate * db / samples.length;
      if (epoch % Math.max(1, Math.floor(epochs / 24)) === 0 || epoch === epochs - 1) {
        history.push(evaluate(model, samples));
      }
    }

    return { model, history };
  }

  function analyze(options = {}) {
    const samples = createDataset(options);
    const result = train(samples, options);
    const final = evaluate(result.model, samples);
    return {
      samples,
      model: result.model,
      history: result.history,
      metrics: {
        samples: samples.length,
        epochs: Math.max(10, Math.min(800, Math.floor(options.epochs || 220))),
        loss: final.loss,
        accuracy: final.accuracy,
        wx: result.model.wx,
        wy: result.model.wy,
        bias: result.model.bias,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(50, Math.floor(options.runs || 10)));
    const started = performance.now();
    let accuracy = 0;
    for (let index = 0; index < runs; index += 1) {
      accuracy += analyze({ ...options, seed: (options.seed || 43) + index }).metrics.accuracy;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgAccuracy: accuracy / runs };
  }

  window.LogisticCore = {
    analyze,
    benchmark,
    createDataset,
    evaluate,
    predict,
    sigmoid,
    train,
  };
}());
