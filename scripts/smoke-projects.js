const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { readPublishedProjectIds } = require('./project-registry');

const rootDir = process.cwd();
const rayTracerWorkerPath = path.join(rootDir, '001', 'tracer-worker.js');
const fluidWorkerPath = path.join(rootDir, '002', 'fluid-worker.js');

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
    Uint8Array,
    Uint8ClampedArray,
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

function createFluidSettings() {
  return {
    background: '#070806',
    palette: [
      [0.48, 1, 0.77],
      [0.95, 0.79, 0.3],
      [1, 0.37, 0.49],
    ],
    resolution: 24,
    force: 900,
    radius: 0.08,
    dissipation: 0.985,
    velocityDecay: 0.995,
    pressureIterations: 8,
    vorticity: 14,
    sourceStrength: 0.35,
    displayMode: 'dye',
    vectorOverlay: true,
    obstacle: true,
    glow: true,
  };
}

function smokeFluidSimulation() {
  if (!fs.existsSync(fluidWorkerPath)) {
    fail(`Missing worker: ${path.relative(rootDir, fluidWorkerPath)}`);
  }

  const worker = createWorkerContext(fluidWorkerPath);
  const settings = createFluidSettings();
  const result = worker.dispatch({
    type: 'step',
    settings,
    splats: [
      {
        x: 0.52,
        y: 0.48,
        dx: 0.018,
        dy: -0.012,
        pressure: 0.95,
        color: [0.48, 1, 0.77],
      },
    ],
    dt: 0.016,
    time: 1.25,
  });

  if (!result || result.type !== 'frame') {
    fail('Fluid simulation worker did not return a frame message');
  }

  if (result.width !== settings.resolution || result.height !== settings.resolution) {
    fail(`Fluid simulation frame has invalid dimensions: ${result.width} x ${result.height}`);
  }

  if (!result.diagnostics || typeof result.diagnostics !== 'object') {
    fail('Fluid simulation worker did not return diagnostics');
  }

  ['stepMs', 'maxDensity', 'maxSpeed', 'avgDivergence'].forEach((metric) => {
    assertFiniteNumber(result.diagnostics[metric], `Fluid diagnostic ${metric}`);
  });

  const pixels = new Uint8ClampedArray(result.pixels);
  const expectedPixelCount = settings.resolution * settings.resolution * 4;

  if (pixels.length !== expectedPixelCount) {
    fail(`Fluid simulation returned an invalid pixel buffer length: ${pixels.length}`);
  }

  let energy = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];

    if (alpha !== 255) {
      fail(`Fluid simulation returned invalid alpha at pixel ${index / 4}: ${alpha}`);
    }

    energy += pixels[index] + pixels[index + 1] + pixels[index + 2];
  }

  if (energy <= 0) {
    fail('Fluid simulation returned a black smoke frame');
  }

  const benchmark = worker.dispatch({
    type: 'benchmark',
    settings,
    frames: 12,
  });

  if (!benchmark || benchmark.type !== 'benchmark') {
    fail('Fluid simulation worker did not return a benchmark message');
  }

  if (benchmark.frames !== 12 || benchmark.resolution !== settings.resolution) {
    fail(`Fluid benchmark returned invalid dimensions or frame count: ${benchmark.resolution}, ${benchmark.frames}`);
  }

  ['avgStepMs', 'medianStepMs', 'p95StepMs', 'worstStepMs', 'stdDevStepMs', 'stabilityScore', 'totalStepMs'].forEach((metric) => {
    assertFiniteNumber(benchmark[metric], `Fluid benchmark ${metric}`);
  });

  if (benchmark.p95StepMs < benchmark.medianStepMs || benchmark.worstStepMs < benchmark.p95StepMs || benchmark.stabilityScore < 0 || benchmark.stabilityScore > 100) {
    fail('Fluid benchmark returned inconsistent percentile or stability metrics');
  }

  if (!Array.isArray(benchmark.histogram) || benchmark.histogram.reduce((sum, bucket) => sum + bucket.count, 0) !== benchmark.frames) {
    fail('Fluid benchmark returned an invalid timing histogram');
  }

  console.log(`Smoke rendered 002 fluid frame: ${pixels.length / 4} pixels, benchmark ${benchmark.avgStepMs.toFixed(2)} ms avg`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readAssetReferences(html, tagName, attributeName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*>`, 'gi'))]
    .map((match) => match[1])
    .filter((reference) => !/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(reference))
    .filter((reference) => !reference.startsWith('/'))
    .map((reference) => reference.split('#')[0].split('?')[0]);
}

function smokeStandaloneCanvasProject(projectId) {
  const projectDir = path.join(rootDir, projectId);
  const indexPath = path.join(projectDir, 'index.html');
  const metadataPath = path.join(projectDir, 'project.json');

  if (!fs.existsSync(indexPath)) {
    fail(`Missing standalone index for published project ${projectId}`);
  }

  if (!fs.existsSync(metadataPath)) {
    fail(`Missing metadata for published project ${projectId}`);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const metadata = readJson(metadataPath);

  if (!html.includes('<canvas')) {
    fail(`Published project ${projectId} smoke expects a canvas-backed visual surface`);
  }

  if (!html.includes(metadata.name)) {
    fail(`Published project ${projectId} index.html must include its project name`);
  }

  const references = [
    ...readAssetReferences(html, 'script', 'src'),
    ...readAssetReferences(html, 'link', 'href'),
  ];

  references.forEach((reference) => {
    const assetPath = path.join(projectDir, reference);

    if (!assetPath.startsWith(projectDir + path.sep) || !fs.existsSync(assetPath)) {
      fail(`Published project ${projectId} references a missing smoke asset: ${reference}`);
    }
  });

  console.log(`Smoke checked ${projectId} ${metadata.name}: ${references.length} local assets`);
}

function smokePublishedProjects() {
  const smokeHandlers = new Map([
    ['001', smokeRayTracer],
    ['002', smokeFluidSimulation],
    ['003', () => smokeStandaloneCanvasProject('003')],
    ['004', () => smokeStandaloneCanvasProject('004')],
    ['005', () => smokeStandaloneCanvasProject('005')],
    ['006', () => smokeStandaloneCanvasProject('006')],
    ['007', () => smokeStandaloneCanvasProject('007')],
    ['008', () => smokeStandaloneCanvasProject('008')],
  ]);
  const projectIds = readPublishedProjectIds(rootDir);

  projectIds.forEach((projectId) => {
    const handler = smokeHandlers.get(projectId);

    if (!handler) {
      fail(`Missing smoke test for published project ${projectId}`);
    }

    handler();
  });
}

smokePublishedProjects();
