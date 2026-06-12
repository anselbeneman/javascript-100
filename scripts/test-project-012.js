const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const synthCorePath = path.join(rootDir, '012', 'synth-core.js');

function loadSynthCore() {
  const context = vm.createContext({
    window: {},
    Math,
    Float32Array,
  });

  vm.runInContext(fs.readFileSync(synthCorePath, 'utf8'), context, {
    filename: path.relative(rootDir, synthCorePath),
  });

  assert(context.window.SynthCore, 'SynthCore must be exposed on window');
  return context.window.SynthCore;
}

const SynthCore = loadSynthCore();

function assertFiniteNumber(value, label) {
  assert.strictEqual(typeof value, 'number', `${label} must be numeric`);
  assert(Number.isFinite(value), `${label} must be finite`);
}

assert.strictEqual(SynthCore.presetLabel('glass'), 'Glass Cloud');
assert.strictEqual(SynthCore.presetLabel('pulse'), 'Pulse Stream');

{
  const table = SynthCore.generateWavetable({ length: 512, texture: 0.55 });
  assert.strictEqual(table.length, 512);
  let peak = 0;
  for (let index = 0; index < table.length; index += 1) {
    assertFiniteNumber(table[index], 'wavetable sample');
    peak = Math.max(peak, Math.abs(table[index]));
  }
  assert(peak <= 1, 'wavetable should stay bounded');
  assert(peak > 0.2, 'wavetable should contain audible energy');
}

{
  const first = SynthCore.scheduleGrains({
    preset: 'glass',
    sampleRate: 44100,
    duration: 1.2,
    density: 30,
    grainMs: 80,
    spread: 0.4,
    baseFrequency: 220,
    seed: 120,
  });
  const second = SynthCore.scheduleGrains({
    preset: 'glass',
    sampleRate: 44100,
    duration: 1.2,
    density: 30,
    grainMs: 80,
    spread: 0.4,
    baseFrequency: 220,
    seed: 120,
  });
  const third = SynthCore.scheduleGrains({
    preset: 'glass',
    sampleRate: 44100,
    duration: 1.2,
    density: 30,
    grainMs: 80,
    spread: 0.4,
    baseFrequency: 220,
    seed: 121,
  });

  assert.deepStrictEqual(first.slice(0, 8), second.slice(0, 8), 'same seed should reproduce grain schedule');
  assert.notDeepStrictEqual(first.slice(0, 8), third.slice(0, 8), 'different seeds should alter grain schedule');
  assert.strictEqual(first.length, 36, 'grain count should match density and duration');
}

{
  const summary = SynthCore.summarize({
    preset: 'shimmer',
    sampleRate: 22050,
    duration: 0.8,
    density: 28,
    grainMs: 70,
    spread: 0.64,
    texture: 0.72,
    baseFrequency: 330,
    seed: 12,
  });

  assert.strictEqual(summary.buffer.left.length, 17640);
  assert.strictEqual(summary.buffer.right.length, 17640);
  assert(summary.buffer.grains.length > 10, 'render should create grains');
  assertFiniteNumber(summary.analysis.rms, 'analysis rms');
  assertFiniteNumber(summary.analysis.peak, 'analysis peak');
  assertFiniteNumber(summary.analysis.crestFactor, 'analysis crest factor');
  assert(summary.analysis.rms > 0.005, 'render should have RMS energy');
  assert(summary.analysis.peak <= 0.981, 'render should normalize peak safely');
  assert(summary.spectrum.length === 48, 'default summary spectrum should use 48 bins');
  summary.spectrum.forEach((value) => {
    assertFiniteNumber(value, 'spectrum bin');
    assert(value >= 0 && value <= 1.00001, 'spectrum should be normalized');
  });
}

{
  const buffer = SynthCore.renderOffline({
    preset: 'bass',
    sampleRate: 16000,
    duration: 0.5,
    density: 20,
    grainMs: 90,
    spread: 0.2,
    texture: 0.2,
    baseFrequency: 82,
    seed: 55,
  });
  const analysis = SynthCore.analyzeSignal(buffer);
  const spectrum = SynthCore.computeSpectrum(buffer, 16);

  assert.strictEqual(buffer.left.length, 8000);
  assert.strictEqual(buffer.right.length, 8000);
  assert(analysis.grainCount > 0, 'analysis should include grain count');
  assert.strictEqual(spectrum.length, 16);
}

console.log('Project 012 unit tests passed');
