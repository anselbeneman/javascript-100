# 010 - Neural Network Playground

Vanilla JavaScript neural network playground with Canvas 2D decision-boundary rendering, a from-scratch multilayer perceptron, deterministic synthetic datasets, backpropagation training, live loss and accuracy diagnostics, benchmark timing, JSON export, technical report copy, and PNG capture.

## What It Does

- Trains a two-layer neural network directly in the browser.
- Renders the learned decision boundary behind the training samples.
- Supports XOR, nested circles, two moons, and twin spiral datasets.
- Shows loss, accuracy, epoch count, hidden units, sample count, and benchmark timing.
- Exports reproducible JSON state, PNG captures, and a technical report.

## Technical Notes

`neural-core.js` contains the deterministic data generators, multilayer perceptron, tanh hidden activations, sigmoid output, cross-entropy loss, full-batch backpropagation, L2 regularization, evaluation metrics, and network serialization. `main.js` owns rendering, controls, benchmarking, and export behavior.

## Test Coverage

`scripts/test-project-010.js` validates deterministic datasets, deterministic initialization, finite forward passes, loss reduction after training, accuracy improvement, serialization shape, and benchmark-safe training loops.

## Validation

From the repository root:

```bash
pnpm run verify:projects
pnpm run test:010
pnpm run smoke:projects
```
