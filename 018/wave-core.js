(function attachWaveCore(global) {
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

  function indexOf(size, x, y) {
    return y * size + x;
  }

  function createField(options = {}) {
    const size = clamp(Math.round(options.size || 96), 32, 180);
    const total = size * size;
    const field = {
      size,
      previous: new Float32Array(total),
      current: new Float32Array(total),
      next: new Float32Array(total),
      obstacle: new Uint8Array(total),
      steps: 0,
      seed: options.seed || 18,
    };

    createObstacles(field, options);
    return field;
  }

  function createObstacles(field, options = {}) {
    const preset = options.preset || 'lens';
    const size = field.size;
    const center = size * 0.5;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x - center) / size;
        const dy = (y - center) / size;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let blocked = x === 0 || y === 0 || x === size - 1 || y === size - 1;

        if (preset === 'split') {
          blocked = blocked || (Math.abs(x - center) < 2 && (y < size * 0.42 || y > size * 0.58));
        } else if (preset === 'rings') {
          blocked = blocked || (distance > 0.24 && distance < 0.255 && x % 5 !== 0);
        } else if (preset === 'maze') {
          blocked = blocked || ((x % 17 === 0 || y % 19 === 0) && ((x + y) % 11 > 2) && distance < 0.42);
        } else {
          blocked = blocked || (distance > 0.20 && distance < 0.215 && y < center);
        }

        field.obstacle[indexOf(size, x, y)] = blocked ? 1 : 0;
      }
    }
  }

  function injectPulse(field, cx, cy, radius, strength) {
    const size = field.size;
    const centerX = cx * (size - 1);
    const centerY = cy * (size - 1);
    const scaledRadius = Math.max(1, radius * size);

    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const index = indexOf(size, x, y);
        if (field.obstacle[index]) continue;

        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= scaledRadius) {
          const envelope = Math.cos(distance / scaledRadius * Math.PI * 0.5);
          field.current[index] += strength * envelope * envelope;
        }
      }
    }
  }

  function seedPulses(field, options = {}) {
    const random = makeRng(options.seed || field.seed);
    const preset = options.preset || 'lens';
    const pulses = preset === 'split' ? 4 : preset === 'maze' ? 7 : 5;

    injectPulse(field, 0.24, 0.5, 0.055, 1.0);
    for (let index = 0; index < pulses; index += 1) {
      injectPulse(
        field,
        0.25 + random() * 0.55,
        0.2 + random() * 0.6,
        0.018 + random() * 0.024,
        (random() > 0.45 ? 1 : -1) * (0.36 + random() * 0.36),
      );
    }
    field.previous.set(field.current);
  }

  function stepWave(field, options = {}) {
    const size = field.size;
    const c = clamp(Number(options.waveSpeed || 0.46), 0.08, 0.68);
    const damping = clamp(Number(options.damping || 0.006), 0, 0.06);
    const c2 = c * c;

    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const index = indexOf(size, x, y);
        if (field.obstacle[index]) {
          field.next[index] = 0;
          continue;
        }

        const laplacian = (
          field.current[index - 1] +
          field.current[index + 1] +
          field.current[index - size] +
          field.current[index + size] -
          field.current[index] * 4
        );

        field.next[index] = (2 - damping) * field.current[index] - (1 - damping) * field.previous[index] + c2 * laplacian;
      }
    }

    const oldPrevious = field.previous;
    field.previous = field.current;
    field.current = field.next;
    field.next = oldPrevious;
    field.next.fill(0);
    field.steps += 1;
    return measureField(field);
  }

  function measureField(field) {
    let energy = 0;
    let maxAmplitude = 0;
    let activeCells = 0;
    let blockedCells = 0;

    for (let index = 0; index < field.current.length; index += 1) {
      if (field.obstacle[index]) {
        blockedCells += 1;
        continue;
      }

      const value = field.current[index];
      const velocity = field.current[index] - field.previous[index];
      const amplitude = Math.abs(value);
      energy += value * value + velocity * velocity;
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      if (amplitude > 0.004) {
        activeCells += 1;
      }
    }

    return {
      steps: field.steps,
      energy,
      maxAmplitude,
      activeCells,
      blockedCells,
      gridCells: field.current.length,
      activeRatio: activeCells / field.current.length,
    };
  }

  function summarize(options = {}) {
    const field = createField(options);
    seedPulses(field, options);
    const steps = clamp(Math.round(options.steps || 160), 1, 700);
    const history = [];
    let metrics = measureField(field);

    for (let step = 0; step < steps; step += 1) {
      metrics = stepWave(field, options);
      if (step % Math.max(1, Math.floor(steps / 40)) === 0 || step === steps - 1) {
        history.push({
          step: field.steps,
          energy: metrics.energy,
          maxAmplitude: metrics.maxAmplitude,
          activeRatio: metrics.activeRatio,
        });
      }
    }

    return {
      field,
      history,
      metrics,
      settings: {
        size: field.size,
        steps,
        waveSpeed: clamp(Number(options.waveSpeed || 0.46), 0.08, 0.68),
        damping: clamp(Number(options.damping || 0.006), 0, 0.06),
        seed: options.seed || field.seed,
        preset: options.preset || 'lens',
      },
    };
  }

  function benchmarkWave(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 8), 1, 60);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 18) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkWave,
    createField,
    indexOf,
    injectPulse,
    makeRng,
    measureField,
    seedPulses,
    stepWave,
    summarize,
  };

  global.WaveCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
