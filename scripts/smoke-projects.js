const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const rayTracerWorkerPath = path.join(rootDir, '001', 'tracer-worker.js');

function fail(message) {
  throw new Error(message);
}

function assertFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
}

function createWorkerContext(workerPath) {
  let lastMessage = null;
  let clock = 1000;
  const workerDir = path.dirname(workerPath);
  const self = {
    postMessage(message) {
      lastMessage = message;
    },
  };
  const context = vm.createContext({
    self,
    Math,
    performance: {
      now: () => {
        clock += 0.25;
        return clock;
      },
    },
    Float32Array,
  });

  context.importScripts = (...references) => {
    references.forEach((reference) => {
      const scriptPath = path.resolve(workerDir, reference);
      const resolvedWorkerDir = path.resolve(workerDir);

      if (!scriptPath.startsWith(resolvedWorkerDir + path.sep)) {
        fail(`Worker import escapes project directory: ${reference}`);
      }

      vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
        filename: path.relative(rootDir, scriptPath),
      });
    });
  };

  vm.runInContext(fs.readFileSync(workerPath, 'utf8'), context, {
    filename: path.relative(rootDir, workerPath),
  });

  return {
    dispatch(message) {
      lastMessage = null;
      context.self.onmessage({ data: message });
      return lastMessage;
    },
  };
}

function createSmokeScene() {
  return {
    spheres: [
      {
        center: [0, 0.55, 0],
        radius: 0.55,
        material: { type: 'diffuse', color: [0.78, 0.28, 0.22] },
      },
      {
        center: [1.05, 0.35, -0.3],
        radius: 0.35,
        material: { type: 'metal', color: [0.96, 0.76, 0.38], fuzz: 0.05 },
      },
    ],
    planes: [
      {
        point: [0, -0.02, 0],
        normal: [0, 1, 0],
        material: {
          type: 'diffuse',
          color: [0.62, 0.66, 0.68],
          altColor: [0.28, 0.34, 0.4],
          checkerScale: 2.2,
        },
      },
    ],
    sky: {
      horizon: [0.82, 0.88, 0.92],
      zenith: [0.16, 0.24, 0.36],
    },
    sun: {
      direction: [-0.38, 0.82, 0.42],
      color: [0.96, 0.92, 0.82],
      intensity: 1.8,
    },
  };
}

function createSmokeConfig() {
  return {
    width: 64,
    height: 36,
    sample: 1,
    maxBounces: 4,
    camera: {
      width: 64,
      height: 36,
      fov: 38,
      lookFrom: [0, 1.4, 5.4],
      lookAt: [0, 0.55, 0],
      focusDistance: 4.9,
      aperture: 0.01,
    },
  };
}

function smokeRayTracer() {
  if (!fs.existsSync(rayTracerWorkerPath)) {
    fail(`Missing worker: ${path.relative(rootDir, rayTracerWorkerPath)}`);
  }

  const worker = createWorkerContext(rayTracerWorkerPath);
  const tile = { x0: 24, y0: 12, x1: 32, y1: 20 };
  const result = worker.dispatch({
    type: 'render',
    jobId: 1,
    tile,
    config: createSmokeConfig(),
    scene: createSmokeScene(),
  });

  if (!result || result.type !== 'tile') {
    fail('Ray tracer worker did not return a tile message');
  }

  if (result.jobId !== 1) {
    fail(`Unexpected job id: ${result.jobId}`);
  }

  if (result.tile.x0 !== tile.x0 || result.tile.y0 !== tile.y0 || result.tile.x1 !== tile.x1 || result.tile.y1 !== tile.y1) {
    fail('Ray tracer worker returned a mismatched tile');
  }

  assertFiniteNumber(result.rays, 'Ray count');
  assertFiniteNumber(result.mean, 'Tile luminance mean');
  assertFiniteNumber(result.variance, 'Tile luminance variance');

  if (result.rays <= 0) {
    fail('Ray tracer worker returned zero rays');
  }

  const expectedPixelCount = (tile.x1 - tile.x0) * (tile.y1 - tile.y0) * 3;
  if (!(result.pixels instanceof Float32Array) || result.pixels.length !== expectedPixelCount) {
    fail(`Ray tracer worker returned an invalid pixel buffer length: ${result.pixels && result.pixels.length}`);
  }

  let energy = 0;
  for (let index = 0; index < result.pixels.length; index += 1) {
    const value = result.pixels[index];
    if (!Number.isFinite(value) || value < 0) {
      fail(`Invalid pixel value at index ${index}: ${value}`);
    }
    energy += value;
  }

  if (energy <= 0) {
    fail('Ray tracer worker returned a black smoke tile');
  }

  console.log(`Smoke rendered 001 ray tracer tile: ${result.pixels.length / 3} pixels, ${result.rays} rays`);
}

smokeRayTracer();
