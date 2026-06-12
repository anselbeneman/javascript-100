(function () {
  const EPSILON = 1e-7;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeRng(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function datasetLabel(value) {
    const labels = {
      xor: 'XOR Field',
      circles: 'Nested Circles',
      moons: 'Two Moons',
      spiral: 'Twin Spiral',
    };
    return labels[value] || value;
  }

  function randomPoint(rng) {
    return {
      x: rng() * 2 - 1,
      y: rng() * 2 - 1,
    };
  }

  function addNoise(point, rng, noise) {
    return {
      x: clamp(point.x + (rng() * 2 - 1) * noise, -1, 1),
      y: clamp(point.y + (rng() * 2 - 1) * noise, -1, 1),
    };
  }

  function makeXorSample(rng, noise) {
    const point = addNoise(randomPoint(rng), rng, noise);
    return {
      ...point,
      label: point.x * point.y >= 0 ? 1 : 0,
    };
  }

  function makeCircleSample(index, rng, count, noise) {
    const ring = index % 2;
    const angle = rng() * Math.PI * 2;
    const baseRadius = ring === 0 ? 0.32 : 0.74;
    const radius = clamp(baseRadius + (rng() - 0.5) * (0.12 + noise), 0.08, 0.98);
    const point = addNoise({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }, rng, noise * 0.4);

    return {
      ...point,
      label: ring,
      index: index / Math.max(1, count - 1),
    };
  }

  function makeMoonSample(index, rng, count, noise) {
    const upper = index % 2 === 0;
    const angle = rng() * Math.PI;
    const raw = upper
      ? { x: Math.cos(angle) * 0.62 - 0.22, y: Math.sin(angle) * 0.52 + 0.05 }
      : { x: 0.70 - Math.cos(angle) * 0.62, y: -Math.sin(angle) * 0.52 - 0.12 };
    const point = addNoise(raw, rng, noise);

    return {
      ...point,
      label: upper ? 1 : 0,
      index: index / Math.max(1, count - 1),
    };
  }

  function makeSpiralSample(index, rng, count, noise) {
    const arm = index % 2;
    const t = (index / Math.max(1, count - 1)) * 3.8 + rng() * 0.08;
    const radius = 0.16 + t * 0.18;
    const angle = t * Math.PI + arm * Math.PI;
    const point = addNoise({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }, rng, noise * 0.8);

    return {
      ...point,
      label: arm,
      index: index / Math.max(1, count - 1),
    };
  }

  function createDataset(options) {
    const preset = options.preset || 'xor';
    const count = Math.max(20, Math.floor(options.count || 180));
    const noise = clamp(Number(options.noise || 0), 0, 0.4);
    const rng = makeRng(options.seed || 10);
    const samples = [];

    for (let index = 0; index < count; index += 1) {
      if (preset === 'circles') {
        samples.push(makeCircleSample(index, rng, count, noise));
      } else if (preset === 'moons') {
        samples.push(makeMoonSample(index, rng, count, noise));
      } else if (preset === 'spiral') {
        samples.push(makeSpiralSample(index, rng, count, noise));
      } else {
        samples.push(makeXorSample(rng, noise));
      }
    }

    return {
      preset,
      count,
      noise,
      seed: options.seed || 10,
      samples,
    };
  }

  function randomWeight(rng, scale) {
    return (rng() * 2 - 1) * scale;
  }

  function createNetwork(options) {
    const hiddenUnits = Math.max(2, Math.floor(options.hiddenUnits || 8));
    const rng = makeRng(options.seed || 10);
    const weights1 = [];
    const bias1 = [];
    const weights2 = [];

    for (let unit = 0; unit < hiddenUnits; unit += 1) {
      weights1.push([
        randomWeight(rng, 1.15),
        randomWeight(rng, 1.15),
      ]);
      bias1.push(randomWeight(rng, 0.35));
      weights2.push(randomWeight(rng, 1.15));
    }

    return {
      inputUnits: 2,
      hiddenUnits,
      seed: options.seed || 10,
      weights1,
      bias1,
      weights2,
      bias2: randomWeight(rng, 0.25),
    };
  }

  function sigmoid(value) {
    if (value < -35) return 0;
    if (value > 35) return 1;
    return 1 / (1 + Math.exp(-value));
  }

  function readInput(input) {
    return Array.isArray(input)
      ? [Number(input[0]), Number(input[1])]
      : [Number(input.x), Number(input.y)];
  }

  function forward(network, input) {
    const values = readInput(input);
    const hidden = new Array(network.hiddenUnits);

    for (let unit = 0; unit < network.hiddenUnits; unit += 1) {
      const z = network.weights1[unit][0] * values[0]
        + network.weights1[unit][1] * values[1]
        + network.bias1[unit];
      hidden[unit] = Math.tanh(z);
    }

    let outputZ = network.bias2;
    for (let unit = 0; unit < network.hiddenUnits; unit += 1) {
      outputZ += network.weights2[unit] * hidden[unit];
    }

    return {
      input: values,
      hidden,
      output: sigmoid(outputZ),
    };
  }

  function crossEntropy(prediction, label) {
    const value = clamp(prediction, EPSILON, 1 - EPSILON);
    return -(label * Math.log(value) + (1 - label) * Math.log(1 - value));
  }

  function createGradients(network) {
    return {
      weights1: network.weights1.map(() => [0, 0]),
      bias1: network.bias1.map(() => 0),
      weights2: network.weights2.map(() => 0),
      bias2: 0,
    };
  }

  function trainEpoch(network, samples, options) {
    const learningRate = Number(options.learningRate || 0.4);
    const regularization = Number(options.regularization || 0);
    const gradients = createGradients(network);
    const sampleCount = Math.max(1, samples.length);
    let loss = 0;
    let correct = 0;

    samples.forEach((sample) => {
      const activation = forward(network, sample);
      const label = sample.label;
      const deltaOutput = activation.output - label;

      loss += crossEntropy(activation.output, label);
      if ((activation.output >= 0.5 ? 1 : 0) === label) {
        correct += 1;
      }

      for (let unit = 0; unit < network.hiddenUnits; unit += 1) {
        gradients.weights2[unit] += deltaOutput * activation.hidden[unit];
      }
      gradients.bias2 += deltaOutput;

      for (let unit = 0; unit < network.hiddenUnits; unit += 1) {
        const hiddenDerivative = 1 - activation.hidden[unit] * activation.hidden[unit];
        const deltaHidden = deltaOutput * network.weights2[unit] * hiddenDerivative;
        gradients.weights1[unit][0] += deltaHidden * activation.input[0];
        gradients.weights1[unit][1] += deltaHidden * activation.input[1];
        gradients.bias1[unit] += deltaHidden;
      }
    });

    for (let unit = 0; unit < network.hiddenUnits; unit += 1) {
      network.weights2[unit] -= learningRate * (
        gradients.weights2[unit] / sampleCount + regularization * network.weights2[unit]
      );
      network.weights1[unit][0] -= learningRate * (
        gradients.weights1[unit][0] / sampleCount + regularization * network.weights1[unit][0]
      );
      network.weights1[unit][1] -= learningRate * (
        gradients.weights1[unit][1] / sampleCount + regularization * network.weights1[unit][1]
      );
      network.bias1[unit] -= learningRate * gradients.bias1[unit] / sampleCount;
    }
    network.bias2 -= learningRate * gradients.bias2 / sampleCount;

    return {
      loss: loss / sampleCount,
      accuracy: correct / sampleCount,
    };
  }

  function evaluate(network, samples) {
    let loss = 0;
    let correct = 0;
    const confusion = {
      truePositive: 0,
      trueNegative: 0,
      falsePositive: 0,
      falseNegative: 0,
    };

    samples.forEach((sample) => {
      const prediction = forward(network, sample).output;
      const predictedLabel = prediction >= 0.5 ? 1 : 0;

      loss += crossEntropy(prediction, sample.label);
      if (predictedLabel === sample.label) {
        correct += 1;
      }

      if (predictedLabel === 1 && sample.label === 1) confusion.truePositive += 1;
      if (predictedLabel === 0 && sample.label === 0) confusion.trueNegative += 1;
      if (predictedLabel === 1 && sample.label === 0) confusion.falsePositive += 1;
      if (predictedLabel === 0 && sample.label === 1) confusion.falseNegative += 1;
    });

    return {
      loss: loss / Math.max(1, samples.length),
      accuracy: correct / Math.max(1, samples.length),
      confusion,
    };
  }

  function trainNetwork(network, samples, options) {
    const epochs = Math.max(1, Math.floor(options.epochs || 1));
    let lastMetrics = evaluate(network, samples);

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      trainEpoch(network, samples, options);
      lastMetrics = evaluate(network, samples);
    }

    return lastMetrics;
  }

  function serializeNetwork(network) {
    return {
      inputUnits: network.inputUnits,
      hiddenUnits: network.hiddenUnits,
      seed: network.seed,
      weights1: network.weights1.map((row) => row.map((value) => Number(value.toFixed(6)))),
      bias1: network.bias1.map((value) => Number(value.toFixed(6))),
      weights2: network.weights2.map((value) => Number(value.toFixed(6))),
      bias2: Number(network.bias2.toFixed(6)),
    };
  }

  window.NeuralCore = {
    clamp,
    createDataset,
    createNetwork,
    datasetLabel,
    evaluate,
    forward,
    makeRng,
    serializeNetwork,
    trainEpoch,
    trainNetwork,
  };
}());
