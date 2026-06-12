(function () {
  const TAU = Math.PI * 2;

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

  function presetLabel(value) {
    const labels = {
      glass: 'Glass Cloud',
      bass: 'Subharmonic Bloom',
      shimmer: 'Spectral Shimmer',
      pulse: 'Pulse Stream',
    };
    return labels[value] || value;
  }

  function presetSettings(preset) {
    const settings = {
      glass: { baseFrequency: 220, spread: 0.52, density: 38, grainMs: 86, texture: 0.42 },
      bass: { baseFrequency: 82, spread: 0.24, density: 24, grainMs: 126, texture: 0.22 },
      shimmer: { baseFrequency: 330, spread: 0.76, density: 48, grainMs: 64, texture: 0.68 },
      pulse: { baseFrequency: 146, spread: 0.36, density: 30, grainMs: 42, texture: 0.55 },
    };
    return { ...(settings[preset] || settings.glass) };
  }

  function envelopeAt(position) {
    const t = clamp(position, 0, 1);
    return 0.5 - 0.5 * Math.cos(TAU * t);
  }

  function wavetableSample(phase, texture) {
    const wrapped = phase - Math.floor(phase);
    const sine = Math.sin(TAU * wrapped);
    const second = Math.sin(TAU * wrapped * 2 + texture * 1.7) * 0.38;
    const third = Math.sin(TAU * wrapped * 3.03 + texture * 3.1) * 0.18;
    const fold = Math.tanh((sine + second + third) * (1.1 + texture * 1.8));
    return fold;
  }

  function generateWavetable(options = {}) {
    const length = Math.max(128, Math.floor(options.length || 1024));
    const texture = clamp(Number(options.texture || 0.4), 0, 1);
    const samples = new Float32Array(length);

    for (let index = 0; index < length; index += 1) {
      samples[index] = wavetableSample(index / length, texture);
    }

    return samples;
  }

  function scheduleGrains(options = {}) {
    const preset = presetSettings(options.preset || 'glass');
    const sampleRate = Number(options.sampleRate || 44100);
    const duration = Number(options.duration || 2);
    const density = Number(options.density || preset.density);
    const grainMs = Number(options.grainMs || preset.grainMs);
    const spread = Number(options.spread ?? preset.spread);
    const baseFrequency = Number(options.baseFrequency || preset.baseFrequency);
    const rng = makeRng(options.seed || 12);
    const grainCount = Math.max(1, Math.floor(duration * density));
    const grains = [];

    for (let index = 0; index < grainCount; index += 1) {
      const jitter = (rng() - 0.5) / Math.max(1, density);
      const start = clamp(index / density + jitter, 0, duration);
      const cents = (rng() * 2 - 1) * spread * 1200;
      const frequency = baseFrequency * Math.pow(2, cents / 1200);
      const lengthSamples = Math.max(16, Math.floor(sampleRate * grainMs / 1000 * (0.72 + rng() * 0.56)));
      const gain = 0.12 + rng() * 0.18;
      const pan = rng() * 2 - 1;
      const phase = rng();

      grains.push({
        start,
        frequency,
        lengthSamples,
        gain,
        pan,
        phase,
      });
    }

    return grains;
  }

  function renderOffline(options = {}) {
    const preset = presetSettings(options.preset || 'glass');
    const sampleRate = Number(options.sampleRate || 44100);
    const duration = Number(options.duration || 2);
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const left = new Float32Array(length);
    const right = new Float32Array(length);
    const wavetable = generateWavetable({
      length: 2048,
      texture: Number(options.texture ?? preset.texture),
    });
    const grains = scheduleGrains({ ...preset, ...options, sampleRate, duration });

    grains.forEach((grain) => {
      const startIndex = Math.floor(grain.start * sampleRate);
      for (let offset = 0; offset < grain.lengthSamples; offset += 1) {
        const index = startIndex + offset;
        if (index < 0 || index >= length) continue;

        const phase = (grain.phase + offset * grain.frequency / sampleRate) % 1;
        const tableIndex = Math.floor(phase * wavetable.length) % wavetable.length;
        const envelope = envelopeAt(offset / Math.max(1, grain.lengthSamples - 1));
        const sample = wavetable[tableIndex] * envelope * grain.gain;
        const leftGain = Math.sqrt((1 - grain.pan) * 0.5);
        const rightGain = Math.sqrt((1 + grain.pan) * 0.5);

        left[index] += sample * leftGain;
        right[index] += sample * rightGain;
      }
    });

    let peak = 0;
    for (let index = 0; index < length; index += 1) {
      peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
    }

    if (peak > 0.98) {
      const scale = 0.98 / peak;
      for (let index = 0; index < length; index += 1) {
        left[index] *= scale;
        right[index] *= scale;
      }
    }

    return {
      left,
      right,
      grains,
      sampleRate,
      duration,
    };
  }

  function analyzeSignal(buffer) {
    const left = buffer.left;
    const right = buffer.right;
    let sumSquares = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let previous = 0;

    for (let index = 0; index < left.length; index += 1) {
      const mono = (left[index] + right[index]) * 0.5;
      sumSquares += mono * mono;
      peak = Math.max(peak, Math.abs(mono));
      if ((mono >= 0 && previous < 0) || (mono < 0 && previous >= 0)) {
        zeroCrossings += 1;
      }
      previous = mono;
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, left.length));
    const crestFactor = peak / Math.max(1e-6, rms);
    const zeroCrossingRate = zeroCrossings / Math.max(1, left.length);

    return {
      rms,
      peak,
      crestFactor,
      zeroCrossingRate,
      grainCount: buffer.grains.length,
      duration: buffer.duration,
    };
  }

  function computeSpectrum(buffer, bins = 64) {
    const length = Math.min(2048, buffer.left.length);
    const start = Math.max(0, Math.floor(buffer.left.length * 0.5 - length * 0.5));
    const spectrum = [];

    for (let bin = 0; bin < bins; bin += 1) {
      let real = 0;
      let imag = 0;
      const harmonic = bin + 1;

      for (let index = 0; index < length; index += 1) {
        const mono = (buffer.left[start + index] + buffer.right[start + index]) * 0.5;
        const window = 0.5 - 0.5 * Math.cos(TAU * index / Math.max(1, length - 1));
        const angle = TAU * harmonic * index / length;
        real += mono * window * Math.cos(angle);
        imag -= mono * window * Math.sin(angle);
      }

      spectrum.push(Math.sqrt(real * real + imag * imag) / length);
    }

    const max = Math.max(...spectrum, 1e-6);
    return spectrum.map((value) => value / max);
  }

  function summarize(options = {}) {
    const buffer = renderOffline(options);
    const analysis = analyzeSignal(buffer);
    const spectrum = computeSpectrum(buffer, 48);
    return {
      buffer,
      analysis,
      spectrum,
    };
  }

  window.SynthCore = {
    analyzeSignal,
    clamp,
    computeSpectrum,
    envelopeAt,
    generateWavetable,
    presetLabel,
    presetSettings,
    renderOffline,
    scheduleGrains,
    summarize,
    wavetableSample,
  };
}());
