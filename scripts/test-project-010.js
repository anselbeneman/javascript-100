const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const neuralCorePath = path.join(rootDir, '010', 'neural-core.js');

function loadNeuralCore() {
  const context = vm.createContext({
    window: {},
    Math,
  });

  vm.runInContext(fs.readFileSync(neuralCorePath, 'utf8'), context, {
    filename: path.relative(rootDir, neuralCorePath),
  });

  assert(context.window.NeuralCore, 'NeuralCore must be exposed on window');
  return context.window.NeuralCore;
}

const NeuralCore = loadNeuralCore();

function assertFiniteNumber(value, label) {
  assert.strictEqual(typeof value, 'number', `${label} must be numeric`);
  assert(Number.isFinite(value), `${label} must be finite`);
}

assert.strictEqual(NeuralCore.datasetLabel('xor'), 'XOR Field');
assert.strictEqual(NeuralCore.datasetLabel('spiral'), 'Twin Spiral');

{
  const first = NeuralCore.createDataset({ preset: 'moons', count: 90, noise: 0.05, seed: 42 });
  const second = NeuralCore.createDataset({ preset: 'moons', count: 90, noise: 0.05, seed: 42 });
  const third = NeuralCore.createDataset({ preset: 'moons', count: 90, noise: 0.05, seed: 43 });

  assert.deepStrictEqual(first.samples.slice(0, 8), second.samples.slice(0, 8), 'same seed must reproduce samples');
  assert.notDeepStrictEqual(first.samples.slice(0, 8), third.samples.slice(0, 8), 'different seeds should change samples');
  assert.strictEqual(first.samples.length, 90, 'dataset should use requested sample count');
}

{
  const first = NeuralCore.createNetwork({ hiddenUnits: 9, seed: 123 });
  const second = NeuralCore.createNetwork({ hiddenUnits: 9, seed: 123 });
  const third = NeuralCore.createNetwork({ hiddenUnits: 9, seed: 124 });

  assert.deepStrictEqual(first.weights1, second.weights1, 'same seed must reproduce weights');
  assert.notDeepStrictEqual(first.weights1, third.weights1, 'different seeds should change weights');
  assert.strictEqual(first.hiddenUnits, 9, 'network should keep requested hidden units');
}

{
  const dataset = NeuralCore.createDataset({ preset: 'circles', count: 180, noise: 0.04, seed: 10 });
  const network = NeuralCore.createNetwork({ hiddenUnits: 10, seed: 1019 });
  const initial = NeuralCore.evaluate(network, dataset.samples);

  const prediction = NeuralCore.forward(network, dataset.samples[0]);
  assertFiniteNumber(prediction.output, 'forward output');
  assert(prediction.output >= 0 && prediction.output <= 1, 'forward output should be a probability');

  const trained = NeuralCore.trainNetwork(network, dataset.samples, {
    epochs: 220,
    learningRate: 0.58,
    regularization: 0.0002,
  });

  assert(trained.loss < initial.loss * 0.9, `training should reduce loss from ${initial.loss} to ${trained.loss}`);
  assert(trained.accuracy >= initial.accuracy, 'training should not reduce accuracy on deterministic circles');
  assert(trained.accuracy >= 0.72, `trained accuracy should be useful, received ${trained.accuracy}`);
}

{
  const dataset = NeuralCore.createDataset({ preset: 'xor', count: 120, noise: 0.03, seed: 88 });
  const first = NeuralCore.createNetwork({ hiddenUnits: 8, seed: 99 });
  const second = NeuralCore.createNetwork({ hiddenUnits: 8, seed: 99 });
  const options = { epochs: 64, learningRate: 0.46, regularization: 0.0001 };

  NeuralCore.trainNetwork(first, dataset.samples, options);
  NeuralCore.trainNetwork(second, dataset.samples, options);
  assert.deepStrictEqual(NeuralCore.serializeNetwork(first), NeuralCore.serializeNetwork(second), 'training should stay deterministic');
}

{
  const network = NeuralCore.createNetwork({ hiddenUnits: 7, seed: 7 });
  const serialized = NeuralCore.serializeNetwork(network);

  assert.strictEqual(serialized.inputUnits, 2);
  assert.strictEqual(serialized.hiddenUnits, 7);
  assert.strictEqual(serialized.weights1.length, 7);
  assert.strictEqual(serialized.weights2.length, 7);
  assertFiniteNumber(serialized.bias2, 'serialized bias2');
}

console.log('Project 010 unit tests passed');
