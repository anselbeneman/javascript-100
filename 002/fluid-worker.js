importScripts('fluid-core.js', 'fluid-state.js');

const coreTools = self.FluidCoreTools;
if (!coreTools) {
  throw new Error('Fluid worker core tools failed to load');
}
const stateTools = self.FluidStateTools;
if (!stateTools) {
  throw new Error('Fluid worker state tools failed to load');
}

const {
  buildObstacleMask,
  clamp,
  hsvToRgb,
  parseHexColor,
  summarizeStepTimings,
} = coreTools;
const {
  allocateState,
  clearStateFields,
  createState,
  ensureStateSize,
  restoreState: restoreStateSnapshot,
  snapshotState: createStateSnapshot,
  stateIndex,
} = stateTools;

const state = createState();

function allocate(size) {
  allocateState(state, size, buildObstacleMask(size));
}

function ensureSize(size) {
  ensureStateSize(state, size, buildObstacleMask);
}

function index(x, y) {
  return stateIndex(state, x, y);
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function clearState() {
  clearStateFields(state);
}

function snapshotState() {
  return createStateSnapshot(state);
}

function restoreState(snapshot) {
  restoreStateSnapshot(state, snapshot, buildObstacleMask);
}

function fadeEdges(field, amount) {
  const size = state.size;
  const last = size - 1;

  for (let i = 0; i < size; i += 1) {
    field[index(i, 0)] *= amount;
    field[index(i, last)] *= amount;
    field[index(0, i)] *= amount;
    field[index(last, i)] *= amount;
  }
}

function isObstacleIndex(i, settings) {
  return Boolean(settings.obstacle) && state.obstacleSolid[i] === 1;
}

function applyObstacle(settings) {
  if (!settings.obstacle) {
    return;
  }

  const size = state.size;

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = index(x, y);
      const fade = state.obstacleFade[i];

      if (fade >= 1) {
        continue;
      }

      if (state.obstacleSolid[i] === 1) {
        state.vx[i] = 0;
        state.vy[i] = 0;
        state.r[i] *= 0.08;
        state.g[i] *= 0.08;
        state.b[i] *= 0.08;
      } else {
        state.vx[i] *= fade;
        state.vy[i] *= fade;
      }
    }
  }
}

function applyVelocityBoundary() {
  const size = state.size;
  const last = size - 1;

  for (let i = 0; i < size; i += 1) {
    state.vx[index(0, i)] = 0;
    state.vx[index(last, i)] = 0;
    state.vy[index(i, 0)] = 0;
    state.vy[index(i, last)] = 0;
  }
}

function sample(field, x, y) {
  const size = state.size;
  const max = size - 1.001;
  const px = clamp(x, 0.001, max);
  const py = clamp(y, 0.001, max);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const tx = px - x0;
  const ty = py - y0;
  const a = field[index(x0, y0)];
  const c = field[index(x1, y0)];
  const d = field[index(x0, y1)];
  const e = field[index(x1, y1)];

  return (a * (1 - tx) + c * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
}

function advect(target, source, velocityX, velocityY, dt, decay) {
  const size = state.size;
  const scale = dt * size;

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = index(x, y);
      const px = x - velocityX[i] * scale;
      const py = y - velocityY[i] * scale;
      target[i] = sample(source, px, py) * decay;
    }
  }

  fadeEdges(target, decay * 0.985);
}

function addSplat(splat, settings) {
  const size = state.size;
  const cx = splat.x * (size - 1);
  const cy = splat.y * (size - 1);
  const radius = Math.max(2, settings.radius * size);
  const minX = Math.max(1, Math.floor(cx - radius * 2));
  const maxX = Math.min(size - 2, Math.ceil(cx + radius * 2));
  const minY = Math.max(1, Math.floor(cy - radius * 2));
  const maxY = Math.min(size - 2, Math.ceil(cy + radius * 2));
  const force = settings.force * Math.max(0.45, splat.pressure || 0.7);
  const dyePower = 2.2 * Math.max(0.35, splat.pressure || 0.7);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = (dx * dx + dy * dy) / (radius * radius);
      const falloff = Math.exp(-dist);
      const i = index(x, y);

      state.vx[i] += splat.dx * force * falloff;
      state.vy[i] += splat.dy * force * falloff;
      state.r[i] += splat.color[0] * dyePower * falloff;
      state.g[i] += splat.color[1] * dyePower * falloff;
      state.b[i] += splat.color[2] * dyePower * falloff;
    }
  }
}

function injectEmitter(x, y, dx, dy, color, power, settings) {
  addSplat({
    x,
    y,
    dx,
    dy,
    pressure: power,
    color,
  }, settings);
}

function addAutomaticSources(time, settings) {
  if (settings.sourceStrength <= 0) {
    return;
  }

  const palette = settings.palette || [[0.5, 1, 0.8]];
  const power = settings.sourceStrength * 0.48;

  for (let i = 0; i < palette.length; i += 1) {
    const phase = time * (0.55 + i * 0.12) + i * 2.1;
    const x = 0.5 + Math.sin(phase) * (0.22 + i * 0.015);
    const y = 0.5 + Math.cos(phase * 0.83) * (0.18 + i * 0.012);
    const dx = Math.cos(phase * 1.3) * 0.006 * settings.sourceStrength;
    const dy = Math.sin(phase * 1.1) * 0.006 * settings.sourceStrength;
    injectEmitter(x, y, dx, dy, palette[i], power, settings);
  }
}

function computeCurl() {
  const size = state.size;

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = index(x, y);
      const duDy = state.vx[index(x, y + 1)] - state.vx[index(x, y - 1)];
      const dvDx = state.vy[index(x + 1, y)] - state.vy[index(x - 1, y)];
      state.curl[i] = 0.5 * (dvDx - duDy);
    }
  }
}

function applyVorticity(dt, strength) {
  if (strength <= 0) {
    return;
  }

  const size = state.size;
  computeCurl();

  for (let y = 2; y < size - 2; y += 1) {
    for (let x = 2; x < size - 2; x += 1) {
      const i = index(x, y);
      const left = Math.abs(state.curl[index(x - 1, y)]);
      const right = Math.abs(state.curl[index(x + 1, y)]);
      const bottom = Math.abs(state.curl[index(x, y - 1)]);
      const top = Math.abs(state.curl[index(x, y + 1)]);
      let gradX = right - left;
      let gradY = top - bottom;
      const length = Math.hypot(gradX, gradY) + 0.00001;
      gradX /= length;
      gradY /= length;

      const curl = state.curl[i];
      state.vx[i] += gradY * curl * strength * dt;
      state.vy[i] -= gradX * curl * strength * dt;
    }
  }
}

function project(iterations) {
  const size = state.size;
  state.pressure.fill(0);

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = index(x, y);
      const divergence = (
        state.vx[index(x + 1, y)]
        - state.vx[index(x - 1, y)]
        + state.vy[index(x, y + 1)]
        - state.vy[index(x, y - 1)]
      ) * -0.5 / size;
      state.divergence[i] = divergence;
    }
  }

  for (let pass = 0; pass < iterations; pass += 1) {
    state.pressure0.set(state.pressure);

    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const i = index(x, y);
        state.pressure[i] = (
          state.divergence[i]
          + state.pressure0[index(x - 1, y)]
          + state.pressure0[index(x + 1, y)]
          + state.pressure0[index(x, y - 1)]
          + state.pressure0[index(x, y + 1)]
        ) * 0.25;
      }
    }
  }

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = index(x, y);
      state.vx[i] -= 0.5 * size * (state.pressure[index(x + 1, y)] - state.pressure[index(x - 1, y)]);
      state.vy[i] -= 0.5 * size * (state.pressure[index(x, y + 1)] - state.pressure[index(x, y - 1)]);
    }
  }

  applyVelocityBoundary();
}

function stepSimulation(message) {
  const settings = message.settings;
  const dt = clamp(message.dt || 0.016, 0.008, 0.033);
  ensureSize(settings.resolution || 96);

  const splats = message.splats || [];
  splats.forEach((splat) => addSplat(splat, settings));
  addAutomaticSources(message.time || 0, settings);
  applyObstacle(settings);

  applyVorticity(dt, settings.vorticity || 0);
  project(settings.pressureIterations || 18);
  applyObstacle(settings);

  state.vx0.set(state.vx);
  state.vy0.set(state.vy);
  advect(state.vx, state.vx0, state.vx0, state.vy0, dt, settings.velocityDecay || 0.995);
  advect(state.vy, state.vy0, state.vx0, state.vy0, dt, settings.velocityDecay || 0.995);
  applyVelocityBoundary();
  applyObstacle(settings);
  project(settings.pressureIterations || 18);
  applyObstacle(settings);

  state.r0.set(state.r);
  state.g0.set(state.g);
  state.b0.set(state.b);
  advect(state.r, state.r0, state.vx, state.vy, dt, settings.dissipation || 0.985);
  advect(state.g, state.g0, state.vx, state.vy, dt, settings.dissipation || 0.985);
  advect(state.b, state.b0, state.vx, state.vy, dt, settings.dissipation || 0.985);
  applyObstacle(settings);
}

function randomize(settings, time) {
  ensureSize(settings.resolution || 96);
  clearState();

  const palette = settings.palette || [[0.5, 1, 0.8]];

  for (let i = 0; i < 24; i += 1) {
    const phase = time + i * 1.73;
    const color = palette[i % palette.length];
    addSplat({
      x: 0.5 + Math.sin(phase) * 0.34,
      y: 0.5 + Math.cos(phase * 1.21) * 0.28,
      dx: Math.cos(phase * 0.8) * 0.012,
      dy: Math.sin(phase * 1.07) * 0.012,
      pressure: 0.85,
      color,
    }, settings);
  }
}

function renderDyePixel(settings, i, bgR, bgG, bgB) {
  const density = state.r[i] + state.g[i] + state.b[i];
  const shade = clamp(density * 0.08, 0, settings.glow ? 0.46 : 0.32);
  const exposure = settings.glow ? 1.12 : 0.92;
  const r = state.r[i] / (1 + state.r[i] * 0.45);
  const g = state.g[i] / (1 + state.g[i] * 0.45);
  const b = state.b[i] / (1 + state.b[i] * 0.45);

  return [
    clamp(bgR * (1 - shade) + Math.pow(r, 0.72) * 255 * exposure, 0, 255),
    clamp(bgG * (1 - shade) + Math.pow(g, 0.72) * 255 * exposure, 0, 255),
    clamp(bgB * (1 - shade) + Math.pow(b, 0.72) * 255 * exposure, 0, 255),
  ];
}

function renderVelocityPixel(i) {
  const speed = Math.hypot(state.vx[i], state.vy[i]);
  const angle = Math.atan2(state.vy[i], state.vx[i]) / (Math.PI * 2) + 0.5;
  const value = clamp(speed * 24, 0.08, 1);

  return hsvToRgb(angle, 0.86, value);
}

function renderPressurePixel(i) {
  const pressure = clamp(state.pressure[i] * 80, -1, 1);
  const value = Math.abs(pressure);

  if (pressure >= 0) {
    return [
      28 + value * 220,
      42 + value * 100,
      64 + value * 30,
    ];
  }

  return [
    24 + value * 40,
    58 + value * 130,
    76 + value * 205,
  ];
}

function renderCurlPixel(i) {
  const curl = clamp(state.curl[i] * 3.4, -1, 1);
  const value = Math.abs(curl);

  if (curl >= 0) {
    return [
      35 + value * 220,
      56 + value * 170,
      38 + value * 42,
    ];
  }

  return [
    34 + value * 48,
    72 + value * 178,
    88 + value * 186,
  ];
}

function collectDiagnostics(stepMs, settings) {
  const size = state.size;
  let maxDensity = 0;
  let maxSpeed = 0;
  let divergenceTotal = 0;
  let count = 0;

  for (let y = 1; y < size - 1; y += 2) {
    for (let x = 1; x < size - 1; x += 2) {
      const i = index(x, y);

      if (isObstacleIndex(i, settings)) {
        continue;
      }

      const density = state.r[i] + state.g[i] + state.b[i];
      const speed = Math.hypot(state.vx[i], state.vy[i]);
      const divergence = Math.abs((
        state.vx[index(x + 1, y)]
        - state.vx[index(x - 1, y)]
        + state.vy[index(x, y + 1)]
        - state.vy[index(x, y - 1)]
      ) * 0.5 / size);

      maxDensity = Math.max(maxDensity, density);
      maxSpeed = Math.max(maxSpeed, speed);
      divergenceTotal += divergence;
      count += 1;
    }
  }

  return {
    stepMs,
    maxDensity,
    maxSpeed,
    avgDivergence: count > 0 ? divergenceTotal / count : 0,
  };
}

function collectVectorSamples(settings) {
  const size = state.size;
  const rows = 9;
  const cols = 12;
  const samples = new Float32Array(rows * cols * 4);
  let offset = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round(((col + 0.5) / cols) * (size - 1));
      const y = Math.round(((row + 0.5) / rows) * (size - 1));
      const i = index(x, y);
      const insideObstacle = isObstacleIndex(i, settings);

      samples[offset] = x / (size - 1);
      samples[offset + 1] = y / (size - 1);
      samples[offset + 2] = insideObstacle ? 0 : state.vx[i];
      samples[offset + 3] = insideObstacle ? 0 : state.vy[i];
      offset += 4;
    }
  }

  return samples;
}

function renderPixels(settings) {
  const size = state.size;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const [bgR, bgG, bgB] = parseHexColor(settings.background, '#070806');
  const mode = settings.displayMode || 'dye';

  if (mode === 'curl') {
    computeCurl();
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = index(x, y);
      const p = i * 4;
      let rgb;

      if (isObstacleIndex(i, settings)) {
        const rim = state.obstacleRim[i] === 1 ? 62 : 14;
        rgb = [rim, Math.max(12, rim * 0.84), Math.max(10, rim * 0.54)];
      } else if (mode === 'velocity') {
        rgb = renderVelocityPixel(i);
      } else if (mode === 'pressure') {
        rgb = renderPressurePixel(i);
      } else if (mode === 'curl') {
        rgb = renderCurlPixel(i);
      } else {
        rgb = renderDyePixel(settings, i, bgR, bgG, bgB);
      }

      pixels[p] = rgb[0];
      pixels[p + 1] = rgb[1];
      pixels[p + 2] = rgb[2];
      pixels[p + 3] = 255;
    }
  }

  return pixels;
}

function postFrame(settings, stepMs) {
  const pixels = renderPixels(settings);
  const diagnostics = collectDiagnostics(stepMs || 0, settings);
  const vectorSamples = settings.vectorOverlay ? collectVectorSamples(settings) : null;
  const transfers = [pixels.buffer];
  const message = {
    type: 'frame',
    width: state.size,
    height: state.size,
    pixels: pixels.buffer,
    diagnostics,
  };

  if (vectorSamples) {
    message.vectorSamples = vectorSamples.buffer;
    transfers.push(vectorSamples.buffer);
  }

  self.postMessage(message, transfers);
}

function runBenchmark(settings, frameCount) {
  const snapshot = snapshotState();
  const benchmarkSettings = {
    ...settings,
    vectorOverlay: false,
    displayMode: 'dye',
  };
  const frames = Math.max(12, Math.min(120, frameCount || 36));
  const warmupFrames = Math.max(3, Math.min(12, Math.round(frames * 0.18)));
  const stepTimings = [];

  ensureSize(benchmarkSettings.resolution || 80);
  clearState();
  randomize(benchmarkSettings, 1.25);

  for (let frame = 0; frame < frames + warmupFrames; frame += 1) {
    const phase = 1.25 + frame * 0.19;
    const started = now();

    stepSimulation({
      settings: benchmarkSettings,
      dt: 0.016,
      time: 1.25 + frame * 0.016,
      splats: [
        {
          x: 0.5 + Math.sin(phase) * 0.24,
          y: 0.52 + Math.cos(phase * 0.8) * 0.18,
          dx: Math.cos(phase * 1.2) * 0.018,
          dy: Math.sin(phase * 1.1) * 0.018,
          pressure: 0.82,
          color: benchmarkSettings.palette[frame % benchmarkSettings.palette.length],
        },
      ],
    });

    const elapsed = now() - started;

    if (frame >= warmupFrames) {
      stepTimings.push(elapsed);
    }
  }

  const summary = summarizeStepTimings(stepTimings);
  const diagnostics = collectDiagnostics(summary.avgStepMs, benchmarkSettings);

  restoreState(snapshot);

  return {
    type: 'benchmark',
    frames,
    warmupFrames,
    resolution: benchmarkSettings.resolution || 80,
    ...summary,
    diagnostics,
  };
}

self.onmessage = (event) => {
  const message = event.data;

  if (message.type === 'reset') {
    ensureSize(message.settings.resolution || 96);
    clearState();
    postFrame(message.settings, 0);
    return;
  }

  if (message.type === 'randomize') {
    const started = now();
    randomize(message.settings, message.time || 0);
    postFrame(message.settings, now() - started);
    return;
  }

  if (message.type === 'benchmark') {
    self.postMessage(runBenchmark(message.settings, message.frames));
    return;
  }

  if (message.type === 'step') {
    const started = now();
    stepSimulation(message);
    postFrame(message.settings, now() - started);
  }
};

self.postMessage({ type: 'ready' });
