const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const vm = require('vm');
const { readPublishedProjectIds } = require('./project-registry');

const rootDir = process.cwd();
const rayTracerWorkerPath = path.join(rootDir, '001', 'tracer-worker.js');
const fluidWorkerPath = path.join(rootDir, '002', 'fluid-worker.js');
const ikCorePath = path.join(rootDir, '009', 'ik-core.js');
const neuralCorePath = path.join(rootDir, '010', 'neural-core.js');
const compilerCorePath = path.join(rootDir, '011', 'compiler-core.js');
const synthCorePath = path.join(rootDir, '012', 'synth-core.js');
const meshCorePath = path.join(rootDir, '013', 'mesh-core.js');
const kalmanCorePath = path.join(rootDir, '014', 'kalman-core.js');
const geneticCorePath = path.join(rootDir, '015', 'genetic-core.js');
const fourierCorePath = path.join(rootDir, '016', 'fourier-core.js');
const collisionCorePath = path.join(rootDir, '017', 'collision-core.js');
const waveCorePath = path.join(rootDir, '018', 'wave-core.js');
const flockCorePath = path.join(rootDir, '019', 'flock-core.js');
const clothCorePath = path.join(rootDir, '020', 'cloth-core.js');
const sdfCorePath = path.join(rootDir, '021', 'sdf-core.js');
const mctsCorePath = path.join(rootDir, '022', 'mcts-core.js');
const probCorePath = path.join(rootDir, '023', 'prob-core.js');
const exactCorePath = path.join(rootDir, '024', 'exact-core.js');
const regexCorePath = path.join(rootDir, '025', 'regex-core.js');
const searchCorePath = path.join(rootDir, '026', 'search-core.js');
const parserCorePath = path.join(rootDir, '027', 'parser-core.js');
const lsystemCorePath = path.join(rootDir, '028', 'lsystem-core.js');
const pathCorePath = path.join(rootDir, '029', 'path-core.js');
const marchingCorePath = path.join(rootDir, '030', 'marching-core.js');
const clipCorePath = path.join(rootDir, '031', 'clip-core.js');
const fftCorePath = path.join(rootDir, '032', 'fft-core.js');
const huffmanCorePath = path.join(rootDir, '033', 'huffman-core.js');
const treeCorePath = path.join(rootDir, '034', 'tree-core.js');
const kmeansCorePath = path.join(rootDir, '035', 'kmeans-core.js');
const minimaxCorePath = path.join(rootDir, '036', 'minimax-core.js');
const triangulateCorePath = path.join(rootDir, '037', 'triangulate-core.js');
const schedulerCorePath = path.join(rootDir, '038', 'scheduler-core.js');
const btreeCorePath = path.join(rootDir, '039', 'btree-core.js');

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

function loadBrowserGlobal(scriptPath, globalName) {
  const context = vm.createContext({
    window: {},
    Math,
  });

  vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
    filename: path.relative(rootDir, scriptPath),
  });

  const globalValue = context.window[globalName];
  if (!globalValue) {
    fail(`Expected ${globalName} to be exposed by ${path.relative(rootDir, scriptPath)}`);
  }

  return globalValue;
}

function smokeInverseKinematics() {
  smokeStandaloneCanvasProject('009');

  const IKCore = loadBrowserGlobal(ikCorePath, 'IKCore');
  const sceneOptions = {
    preset: 'precision',
    width: 960,
    height: 540,
    segmentCount: 8,
    segmentLength: 58,
    seed: 9,
  };
  const scene = IKCore.createScene(sceneOptions);

  if (!Array.isArray(scene.chains) || scene.chains.length !== 3) {
    fail(`IK smoke expected 3 chains, received ${scene.chains && scene.chains.length}`);
  }

  if (!Array.isArray(scene.obstacles) || scene.obstacles.length < 1) {
    fail('IK smoke expected deterministic obstacles');
  }

  ['fabrik', 'ccd'].forEach((solver) => {
    const solverScene = IKCore.createScene(sceneOptions);
    const result = IKCore.solveScene(solverScene.chains, { x: 640, y: 250 }, {
      solver,
      maxIterations: 16,
      maxJointAngle: 126 * Math.PI / 180,
      clampJoints: true,
      avoidObstacles: true,
      obstaclePadding: 12,
      obstacles: solverScene.obstacles,
      tolerance: 1.2,
    });

    assertFiniteNumber(result.metrics.averageError, `IK ${solver} average error`);
    assertFiniteNumber(result.metrics.averageReachRatio, `IK ${solver} reach ratio`);
    assertFiniteNumber(result.metrics.iterations, `IK ${solver} iterations`);

    if (result.metrics.averageError < 0 || result.metrics.averageError > 260) {
      fail(`IK ${solver} returned an implausible average error: ${result.metrics.averageError}`);
    }

    if (result.metrics.joints !== 27) {
      fail(`IK ${solver} returned invalid joint count: ${result.metrics.joints}`);
    }
  });

  console.log('Smoke solved 009 inverse kinematics scene with FABRIK and CCD');
}

function smokeNeuralNetwork() {
  smokeStandaloneCanvasProject('010');

  const NeuralCore = loadBrowserGlobal(neuralCorePath, 'NeuralCore');
  const dataset = NeuralCore.createDataset({
    preset: 'circles',
    count: 120,
    noise: 0.04,
    seed: 10,
  });
  const network = NeuralCore.createNetwork({
    hiddenUnits: 8,
    seed: 1019,
  });
  const before = NeuralCore.evaluate(network, dataset.samples);
  const after = NeuralCore.trainNetwork(network, dataset.samples, {
    epochs: 160,
    learningRate: 0.58,
    regularization: 0.0002,
  });

  assertFiniteNumber(before.loss, 'Neural smoke initial loss');
  assertFiniteNumber(after.loss, 'Neural smoke final loss');
  assertFiniteNumber(after.accuracy, 'Neural smoke final accuracy');

  if (after.loss >= before.loss) {
    fail(`Neural smoke expected lower loss after training, received ${before.loss} -> ${after.loss}`);
  }

  if (after.accuracy < 0.68) {
    fail(`Neural smoke expected useful accuracy after training, received ${after.accuracy}`);
  }

  console.log(`Smoke trained 010 neural network: loss ${before.loss.toFixed(3)} -> ${after.loss.toFixed(3)}, accuracy ${(after.accuracy * 100).toFixed(0)}%`);
}

function smokeBytecodeVM() {
  smokeStandaloneCanvasProject('011');

  const CompilerCore = loadBrowserGlobal(compilerCorePath, 'CompilerCore');
  const source = CompilerCore.presetSource('orbit');
  const output = CompilerCore.runSource(source, {
    samples: 128,
    phase: 0.25,
  });

  if (output.tokens.length < 20) {
    fail(`Bytecode VM smoke expected a non-trivial token stream, received ${output.tokens.length}`);
  }

  if (output.program.bytecode.length < 10) {
    fail(`Bytecode VM smoke expected non-trivial bytecode, received ${output.program.bytecode.length}`);
  }

  if (output.result.metrics.plotCount !== 128) {
    fail(`Bytecode VM smoke expected 128 plots, received ${output.result.metrics.plotCount}`);
  }

  assertFiniteNumber(output.result.plots[0].x, 'Bytecode VM first plot x');
  assertFiniteNumber(output.result.plots[0].y, 'Bytecode VM first plot y');

  console.log(`Smoke executed 011 bytecode VM: ${output.program.bytecode.length} instructions, ${output.result.metrics.steps} steps`);
}

function smokeGranularSynth() {
  smokeStandaloneCanvasProject('012');

  const SynthCore = loadBrowserGlobal(synthCorePath, 'SynthCore');
  const summary = SynthCore.summarize({
    preset: 'glass',
    sampleRate: 22050,
    duration: 0.8,
    density: 26,
    grainMs: 74,
    spread: 0.52,
    texture: 0.46,
    baseFrequency: 220,
    seed: 12,
  });

  assertFiniteNumber(summary.analysis.rms, 'Granular synth RMS');
  assertFiniteNumber(summary.analysis.peak, 'Granular synth peak');
  assertFiniteNumber(summary.analysis.zeroCrossingRate, 'Granular synth ZCR');

  if (summary.analysis.rms <= 0.005) {
    fail(`Granular synth smoke expected audible RMS, received ${summary.analysis.rms}`);
  }

  if (summary.analysis.peak <= 0.02 || summary.analysis.peak > 0.981) {
    fail(`Granular synth smoke expected normalized peak, received ${summary.analysis.peak}`);
  }

  if (!Array.isArray(summary.spectrum) || summary.spectrum.length !== 48) {
    fail('Granular synth smoke expected 48 normalized spectrum bins');
  }

  console.log(`Smoke rendered 012 granular synth: ${summary.analysis.grainCount} grains, RMS ${summary.analysis.rms.toFixed(3)}`);
}

function smokeDelaunayMesh() {
  smokeStandaloneCanvasProject('013');

  const MeshCore = loadBrowserGlobal(meshCorePath, 'MeshCore');
  const mesh = MeshCore.createMesh({
    count: 64,
    spread: 0.86,
    jitter: 0.28,
    seed: 13,
  });

  assertFiniteNumber(mesh.stats.triangleCount, 'Delaunay triangle count');
  assertFiniteNumber(mesh.stats.minAngle, 'Delaunay minimum angle');
  assertFiniteNumber(mesh.stats.coverageArea, 'Delaunay coverage area');

  if (mesh.points.length !== 64 || mesh.triangles.length < 80) {
    fail(`Delaunay smoke expected a non-trivial mesh, received ${mesh.points.length} points and ${mesh.triangles.length} triangles`);
  }

  if (mesh.stats.minAngle <= 0 || mesh.stats.coverageArea <= 0.1) {
    fail('Delaunay smoke returned invalid geometry metrics');
  }

  console.log(`Smoke generated 013 Delaunay mesh: ${mesh.points.length} points, ${mesh.triangles.length} triangles`);
}

function smokeKalmanFilter() {
  smokeStandaloneCanvasProject('014');

  const KalmanCore = loadBrowserGlobal(kalmanCorePath, 'KalmanCore');
  const summary = KalmanCore.summarize({
    steps: 180,
    noise: 0.1,
    processNoise: 0.02,
    seed: 14,
  });

  assertFiniteNumber(summary.metrics.measurementRmse, 'Kalman measurement RMSE');
  assertFiniteNumber(summary.metrics.filteredRmse, 'Kalman filtered RMSE');
  assertFiniteNumber(summary.metrics.improvement, 'Kalman improvement');

  if (summary.metrics.filteredRmse >= summary.metrics.measurementRmse) {
    fail(`Kalman smoke expected filtered RMSE to improve raw signal: ${summary.metrics.filteredRmse} >= ${summary.metrics.measurementRmse}`);
  }

  console.log(`Smoke filtered 014 Kalman track: RMSE ${summary.metrics.measurementRmse.toFixed(3)} -> ${summary.metrics.filteredRmse.toFixed(3)}`);
}

function smokeGeneticOptimizer() {
  smokeStandaloneCanvasProject('015');

  const GeneticCore = loadBrowserGlobal(geneticCorePath, 'GeneticCore');
  const result = GeneticCore.runEvolution({
    cityCount: 24,
    populationSize: 64,
    generations: 100,
    mutationRate: 0.16,
    seed: 15,
  });

  assertFiniteNumber(result.initialBestLength, 'Genetic initial best length');
  assertFiniteNumber(result.bestLength, 'Genetic best length');
  assertFiniteNumber(result.improvement, 'Genetic improvement');

  if (!GeneticCore.isValidRoute(result.bestRoute, result.cities.length)) {
    fail('Genetic smoke returned an invalid best route');
  }

  if (result.bestLength >= result.initialBestLength) {
    fail(`Genetic smoke expected route improvement: ${result.initialBestLength} -> ${result.bestLength}`);
  }

  console.log(`Smoke optimized 015 route: ${result.initialBestLength.toFixed(3)} -> ${result.bestLength.toFixed(3)}`);
}

function smokeFourierEpicycle() {
  smokeStandaloneCanvasProject('016');

  const FourierCore = loadBrowserGlobal(fourierCorePath, 'FourierCore');
  const summary = FourierCore.summarize({
    preset: 'gear',
    count: 144,
    harmonics: 24,
    seed: 16,
  });

  assertFiniteNumber(summary.metrics.partialError, 'Fourier partial error');
  assertFiniteNumber(summary.metrics.lowError, 'Fourier low harmonic error');
  assertFiniteNumber(summary.metrics.fullError, 'Fourier full error');

  if (summary.metrics.partialError >= summary.metrics.lowError || summary.metrics.fullError > 1e-8) {
    fail('Fourier smoke expected harmonic reconstruction error to improve and full reconstruction to be exact');
  }

  console.log(`Smoke reconstructed 016 Fourier path: error ${summary.metrics.partialError.toFixed(4)}, ${summary.metrics.harmonics} harmonics`);
}

function smokeCollisionEngine() {
  smokeStandaloneCanvasProject('017');

  const CollisionCore = loadBrowserGlobal(collisionCorePath, 'CollisionCore');
  const summary = CollisionCore.summarize({
    count: 7,
    frames: 120,
    restitution: 0.64,
    seed: 17,
  });

  assertFiniteNumber(summary.metrics.energy, 'SAT collision energy');
  assertFiniteNumber(summary.metrics.pairCount, 'SAT collision pair count');
  assertFiniteNumber(summary.metrics.maxPenetration, 'SAT collision max penetration');

  if (summary.metrics.bodies !== 8 || summary.metrics.pairCount !== 28) {
    fail(`SAT collision smoke expected 8 bodies and 28 pairs, received ${summary.metrics.bodies} and ${summary.metrics.pairCount}`);
  }

  console.log(`Smoke simulated 017 SAT collisions: ${summary.metrics.bodies} bodies, ${summary.metrics.maxContacts} max contacts`);
}

function smokeWaveEquation() {
  smokeStandaloneCanvasProject('018');

  const WaveCore = loadBrowserGlobal(waveCorePath, 'WaveCore');
  const summary = WaveCore.summarize({
    preset: 'split',
    size: 64,
    steps: 100,
    waveSpeed: 0.44,
    damping: 0.006,
    seed: 18,
  });

  assertFiniteNumber(summary.metrics.energy, 'Wave equation energy');
  assertFiniteNumber(summary.metrics.maxAmplitude, 'Wave equation amplitude');
  assertFiniteNumber(summary.metrics.activeRatio, 'Wave equation active ratio');

  if (summary.metrics.energy <= 0 || summary.metrics.maxAmplitude <= 0.001 || summary.metrics.blockedCells <= 0) {
    fail('Wave equation smoke expected measurable energy, amplitude, and obstacle cells');
  }

  console.log(`Smoke solved 018 wave equation: energy ${summary.metrics.energy.toFixed(2)}, active ${(summary.metrics.activeRatio * 100).toFixed(0)}%`);
}

function smokeSpatialHashFlocking() {
  smokeStandaloneCanvasProject('019');

  const FlockCore = loadBrowserGlobal(flockCorePath, 'FlockCore');
  const summary = FlockCore.summarize({
    preset: 'swarm',
    count: 140,
    frames: 100,
    perception: 0.11,
    maxSpeed: 0.34,
    seed: 19,
  });

  assertFiniteNumber(summary.metrics.averageNeighbors, 'Flocking average neighbors');
  assertFiniteNumber(summary.metrics.searchReduction, 'Flocking search reduction');
  assertFiniteNumber(summary.metrics.polarization, 'Flocking polarization');

  if (summary.metrics.averageNeighbors <= 0 || summary.metrics.searchReduction < 0.5) {
    fail('Flocking smoke expected spatial hash neighbor detection with meaningful check reduction');
  }

  console.log(`Smoke simulated 019 flocking: ${summary.metrics.agents} agents, ${(summary.metrics.searchReduction * 100).toFixed(0)}% fewer checks`);
}

function smokeVerletCloth() {
  smokeStandaloneCanvasProject('020');

  const ClothCore = loadBrowserGlobal(clothCorePath, 'ClothCore');
  const summary = ClothCore.summarize({
    cols: 16,
    rows: 11,
    steps: 120,
    iterations: 10,
    wind: 0.1,
    pinMode: 'tabs',
    seed: 20,
  });

  assertFiniteNumber(summary.metrics.averageStretch, 'Cloth average stretch');
  assertFiniteNumber(summary.metrics.maxStretch, 'Cloth max stretch');
  assertFiniteNumber(summary.metrics.kineticEnergy, 'Cloth kinetic energy');

  if (summary.metrics.particles !== 176 || summary.metrics.maxStretch > 0.26) {
    fail(`Cloth smoke expected stable constraints, received ${summary.metrics.particles} particles and max stretch ${summary.metrics.maxStretch}`);
  }

  console.log(`Smoke solved 020 cloth: ${summary.metrics.particles} particles, max stretch ${summary.metrics.maxStretch.toFixed(3)}`);
}

function smokeSdfRayMarcher() {
  smokeStandaloneCanvasProject('021');

  const SdfCore = loadBrowserGlobal(sdfCorePath, 'SdfCore');
  const frame = SdfCore.render({
    preset: 'fusion',
    width: 80,
    height: 45,
    maxSteps: 64,
    time: 0.25,
  });

  assertFiniteNumber(frame.metrics.hitRatio, 'SDF hit ratio');
  assertFiniteNumber(frame.metrics.averageSteps, 'SDF average steps');
  assertFiniteNumber(frame.metrics.colorEnergy, 'SDF color energy');

  if (!frame.pixels || frame.pixels.length !== 80 * 45 * 4) {
    fail('SDF smoke expected a valid RGBA pixel buffer');
  }

  if (frame.metrics.hitRatio <= 0.05 || frame.metrics.colorEnergy <= 20) {
    fail('SDF smoke expected visible ray marched geometry');
  }

  console.log(`Smoke rendered 021 SDF frame: ${(frame.metrics.hitRatio * 100).toFixed(0)}% hits, ${frame.metrics.averageSteps.toFixed(1)} avg steps`);
}

function smokeMctsStrategy() {
  smokeStandaloneCanvasProject('022');
  const MctsCore = loadBrowserGlobal(mctsCorePath, 'MctsCore');
  const result = MctsCore.runSearch({ iterations: 900, exploration: 1.41, seed: 22 });
  assertFiniteNumber(result.metrics.nodes, 'MCTS node count');
  assertFiniteNumber(result.metrics.bestWinRate, 'MCTS best win rate');
  if (result.metrics.rootVisits !== 900 || result.metrics.nodes < 60 || result.bestMove < 0) {
    fail('MCTS smoke expected a non-trivial deterministic search');
  }
  console.log(`Smoke searched 022 MCTS tree: ${result.metrics.nodes} nodes, best ${result.bestMove}`);
}

function smokeProbabilisticData() {
  smokeStandaloneCanvasProject('023');
  const ProbCore = loadBrowserGlobal(probCorePath, 'ProbCore');
  const result = ProbCore.analyze({ count: 1800, bloomSize: 8192, precision: 8, seed: 23, probes: 900 });
  assertFiniteNumber(result.metrics.falsePositiveRate, 'Bloom false positive rate');
  assertFiniteNumber(result.metrics.hllError, 'HLL error');
  if (result.metrics.uniqueCount < 1200 || result.metrics.falsePositiveRate > 0.16 || result.metrics.hllError > 0.22) {
    fail('Probabilistic data smoke expected useful Bloom/HLL metrics');
  }
  console.log(`Smoke analyzed 023 probabilistic data: ${result.metrics.uniqueCount} unique, HLL ${(result.metrics.hllError * 100).toFixed(1)}% error`);
}

function smokeExactCoverSudoku() {
  smokeStandaloneCanvasProject('024');
  const ExactCore = loadBrowserGlobal(exactCorePath, 'ExactCore');
  const result = ExactCore.solvePuzzle('hard');
  if (!result.solved || !ExactCore.validateBoard(result.board)) {
    fail('Exact cover smoke expected a valid solved Sudoku board');
  }
  assertFiniteNumber(result.stats.decisions, 'Exact cover decisions');
  console.log(`Smoke solved 024 exact cover Sudoku: ${result.stats.decisions} decisions, ${result.stats.backtracks} backtracks`);
}

function smokeRegexNfa() {
  smokeStandaloneCanvasProject('025');
  const RegexCore = loadBrowserGlobal(regexCorePath, 'RegexCore');
  const result = RegexCore.analyze({ pattern: '(a|b)*abb', input: 'aababb' });
  if (!result.result.matched || result.metrics.states < 10) fail('Regex NFA smoke expected a non-trivial successful match');
  console.log(`Smoke matched 025 regex NFA: ${result.metrics.states} states, ${result.metrics.edges} edges`);
}

function smokeBm25Search() {
  smokeStandaloneCanvasProject('026');
  const SearchCore = loadBrowserGlobal(searchCorePath, 'SearchCore');
  const result = SearchCore.analyze({ query: 'procedural rendering geometry' });
  assertFiniteNumber(result.metrics.topScore, 'BM25 top score');
  if (!result.results.length || !result.results[0].text.includes('sdf ray marcher')) fail('BM25 smoke expected SDF ray marcher top result');
  console.log(`Smoke ranked 026 BM25 search: ${result.metrics.hits} hits, top ${result.metrics.topScore.toFixed(3)}`);
}

function smokePrattParser() {
  smokeStandaloneCanvasProject('027');
  const ParserCore = loadBrowserGlobal(parserCorePath, 'ParserCore');
  const result = ParserCore.analyze({ source: '3 + 4 * 2 / (1 - 5)^2^3' });
  assertFiniteNumber(result.metrics.value, 'Pratt parser value');
  if (Math.abs(result.value - 3.0001220703125) > 1e-10 || result.metrics.nodes < 10) fail('Pratt parser smoke expected correct non-trivial AST evaluation');
  console.log(`Smoke parsed 027 Pratt expression: ${result.metrics.nodes} nodes, value ${result.value.toFixed(6)}`);
}

function smokeLSystemGarden() {
  smokeStandaloneCanvasProject('028');
  const LSystemCore = loadBrowserGlobal(lsystemCorePath, 'LSystemCore');
  const result = LSystemCore.analyze({ preset: 'fern', iterations: 4, angle: 25 });
  assertFiniteNumber(result.metrics.segments, 'L-system segment count');
  if (result.metrics.segments < 300 || result.metrics.maxDepth < 6) fail('L-system smoke expected a non-trivial branched grammar');
  console.log(`Smoke generated 028 L-system: ${result.metrics.segments} segments, depth ${result.metrics.maxDepth}`);
}

function smokeAStarPathfinding() {
  smokeStandaloneCanvasProject('029');
  const PathCore = loadBrowserGlobal(pathCorePath, 'PathCore');
  const result = PathCore.analyze({ density: 0.26, seed: 29, heuristic: 'diagonal' });
  assertFiniteNumber(result.metrics.visited, 'A-star visited cells');
  if (!result.metrics.solved || result.metrics.pathLength < 30) fail('A-star smoke expected a solved route');
  console.log(`Smoke solved 029 A-star route: path ${result.metrics.pathLength}, visited ${result.metrics.visited}`);
}

function smokeMarchingSquares() {
  smokeStandaloneCanvasProject('030');
  const MarchingCore = loadBrowserGlobal(marchingCorePath, 'MarchingCore');
  const result = MarchingCore.analyze({ cols: 56, rows: 36, threshold: 0, phase: 0.18 });
  assertFiniteNumber(result.metrics.segments, 'Marching Squares segments');
  if (result.metrics.segments < 90 || result.metrics.activeRatio <= 0.1) fail('Marching Squares smoke expected visible contour geometry');
  console.log(`Smoke extracted 030 contours: ${result.metrics.segments} segments, active ${(result.metrics.activeRatio * 100).toFixed(0)}%`);
}

function smokePolygonClipping() {
  smokeStandaloneCanvasProject('031');
  const ClipCore = loadBrowserGlobal(clipCorePath, 'ClipCore');
  const result = ClipCore.analyze({ window: 'hexagon', scale: 0.68, points: 11 });
  assertFiniteNumber(result.metrics.retainedRatio, 'Polygon clipping retained ratio');
  if (result.metrics.clippedVertices < 6 || result.metrics.retainedRatio <= 0 || result.metrics.retainedRatio >= 1) fail('Polygon clipping smoke expected partial clipped output');
  console.log(`Smoke clipped 031 polygon: ${result.metrics.clippedVertices} vertices, ${(result.metrics.retainedRatio * 100).toFixed(1)}% retained`);
}

function smokeFftSpectrum() {
  smokeStandaloneCanvasProject('032');
  const FftCore = loadBrowserGlobal(fftCorePath, 'FftCore');
  const result = FftCore.analyze({ base: 256, second: 640, third: 960, mix: 0.55 });
  assertFiniteNumber(result.metrics.peakHz, 'FFT peak frequency');
  const peaks = result.peaks.map((peak) => Math.round(peak.hz));
  if (!peaks.includes(256) || !peaks.includes(640)) fail(`FFT smoke expected 256 Hz and 640 Hz peaks, received ${peaks.join(', ')}`);
  console.log(`Smoke analyzed 032 FFT: peak ${result.metrics.peakHz.toFixed(0)} Hz, ${result.metrics.binCount} bins`);
}

function smokeHuffmanCompression() {
  smokeStandaloneCanvasProject('033');
  const HuffmanCore = loadBrowserGlobal(huffmanCorePath, 'HuffmanCore');
  const result = HuffmanCore.analyze({ sample: 'telemetry' });
  assertFiniteNumber(result.metrics.ratio, 'Huffman compression ratio');
  if (!result.metrics.decodedMatches || result.metrics.uniqueSymbols < 12) fail('Huffman smoke expected valid encode/decode evidence');
  console.log(`Smoke compressed 033 Huffman sample: ${result.metrics.encodedBits} bits, ${(result.metrics.ratio * 100).toFixed(1)}% ratio`);
}

function smokeDecisionTree() {
  smokeStandaloneCanvasProject('034');
  const TreeCore = loadBrowserGlobal(treeCorePath, 'TreeCore');
  const result = TreeCore.analyze({ count: 220, maxDepth: 5, seed: 34 });
  assertFiniteNumber(result.metrics.testAccuracy, 'Decision tree test accuracy');
  if (result.metrics.nodes < 5 || result.metrics.testAccuracy < 0.78) fail('Decision tree smoke expected useful classifier accuracy');
  console.log(`Smoke trained 034 decision tree: ${result.metrics.nodes} nodes, ${(result.metrics.testAccuracy * 100).toFixed(1)}% test accuracy`);
}

function smokeKMeansQuantizer() {
  smokeStandaloneCanvasProject('035');
  const KMeansCore = loadBrowserGlobal(kmeansCorePath, 'KMeansCore');
  const result = KMeansCore.analyze({ k: 5, iterations: 14, count: 360, seed: 35 });
  assertFiniteNumber(result.metrics.inertia, 'K-means inertia');
  if (result.metrics.emptyClusters !== 0 || result.metrics.improvement < 0.4) fail('K-means smoke expected stable non-empty clusters');
  console.log(`Smoke clustered 035 K-means colors: inertia ${Math.round(result.metrics.inertia)}, improvement ${(result.metrics.improvement * 100).toFixed(1)}%`);
}

function smokeMinimaxSolver() {
  smokeStandaloneCanvasProject('036');
  const MinimaxCore = loadBrowserGlobal(minimaxCorePath, 'MinimaxCore');
  const result = MinimaxCore.analyze({ preset: 'attack' });
  assertFiniteNumber(result.metrics.nodes, 'Minimax node count');
  if (result.move !== 2 || result.score <= 0 || result.metrics.prunes < 1) fail('Minimax smoke expected winning move with alpha-beta pruning');
  console.log(`Smoke solved 036 minimax move: ${result.move}, nodes ${result.metrics.nodes}, prunes ${result.metrics.prunes}`);
}

function smokeEarClipping() {
  smokeStandaloneCanvasProject('037');
  const TriangulateCore = loadBrowserGlobal(triangulateCorePath, 'TriangulateCore');
  const result = TriangulateCore.analyze({ count: 15, notch: 0.58, phase: 0.2 });
  assertFiniteNumber(result.metrics.areaError, 'Triangulation area error');
  if (result.metrics.triangles !== result.metrics.expectedTriangles || result.metrics.areaError > 1e-8) fail('Ear clipping smoke expected exact polygon area preservation');
  console.log(`Smoke triangulated 037 polygon: ${result.metrics.triangles} triangles, area error ${result.metrics.areaError.toExponential(1)}`);
}

function smokeTopologicalScheduler() {
  smokeStandaloneCanvasProject('038');
  const SchedulerCore = loadBrowserGlobal(schedulerCorePath, 'SchedulerCore');
  const result = SchedulerCore.analyze({ count: 16, density: 0.22, seed: 38 });
  assertFiniteNumber(result.metrics.criticalDuration, 'Scheduler critical duration');
  if (!result.metrics.validOrder || result.metrics.hasCycle || result.metrics.criticalDuration < 16) fail('Scheduler smoke expected valid acyclic critical path');
  console.log(`Smoke scheduled 038 DAG: ${result.metrics.edges} edges, critical path ${result.metrics.criticalDuration}`);
}

function smokeBTreeIndex() {
  smokeStandaloneCanvasProject('039');
  const BTreeCore = loadBrowserGlobal(btreeCorePath, 'BTreeCore');
  const result = BTreeCore.analyze({ degree: 3, count: 42 });
  assertFiniteNumber(result.metrics.height, 'B-tree height');
  if (!result.search.found || result.metrics.height < 2 || result.metrics.nodes < 4) fail('B-tree smoke expected searchable multi-level index');
  console.log(`Smoke built 039 B-tree index: ${result.metrics.keys} keys, height ${result.metrics.height}, nodes ${result.metrics.nodes}`);
}

function smokeProjectWithTestScript(projectId) {
  smokeStandaloneCanvasProject(projectId);

  const testPath = path.join(rootDir, 'scripts', `test-project-${projectId}.js`);
  if (!fs.existsSync(testPath)) {
    fail(`Missing smoke handler and test script for published project ${projectId}`);
  }

  const result = spawnSync(process.execPath, [testPath], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) {
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    fail(`Smoke fallback test failed for project ${projectId}${output ? `:\n${output}` : ''}`);
  }

  const line = (result.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || 'project test passed';
  console.log(`Smoke fallback checked ${projectId}: ${line}`);
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
    ['009', smokeInverseKinematics],
    ['010', smokeNeuralNetwork],
    ['011', smokeBytecodeVM],
    ['012', smokeGranularSynth],
    ['013', smokeDelaunayMesh],
    ['014', smokeKalmanFilter],
    ['015', smokeGeneticOptimizer],
    ['016', smokeFourierEpicycle],
    ['017', smokeCollisionEngine],
    ['018', smokeWaveEquation],
    ['019', smokeSpatialHashFlocking],
    ['020', smokeVerletCloth],
    ['021', smokeSdfRayMarcher],
    ['022', smokeMctsStrategy],
    ['023', smokeProbabilisticData],
    ['024', smokeExactCoverSudoku],
    ['025', smokeRegexNfa],
    ['026', smokeBm25Search],
    ['027', smokePrattParser],
    ['028', smokeLSystemGarden],
    ['029', smokeAStarPathfinding],
    ['030', smokeMarchingSquares],
    ['031', smokePolygonClipping],
    ['032', smokeFftSpectrum],
    ['033', smokeHuffmanCompression],
    ['034', smokeDecisionTree],
    ['035', smokeKMeansQuantizer],
    ['036', smokeMinimaxSolver],
    ['037', smokeEarClipping],
    ['038', smokeTopologicalScheduler],
    ['039', smokeBTreeIndex],
  ]);
  const projectIds = readPublishedProjectIds(rootDir);

  projectIds.forEach((projectId) => {
    const handler = smokeHandlers.get(projectId);

    if (handler) {
      handler();
      return;
    }

    smokeProjectWithTestScript(projectId);
  });
}

smokePublishedProjects();
