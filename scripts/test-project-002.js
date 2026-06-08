const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');

function loadBrowserGlobal(relativePath, globalName) {
  const scriptPath = path.join(rootDir, relativePath);
  const context = vm.createContext({
    window: {},
    Math,
    Date,
  });

  vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
    filename: relativePath,
  });

  assert.ok(context.window[globalName], `${relativePath} must expose window.${globalName}`);
  return context.window[globalName];
}

function createWorkerContext(relativePath) {
  const scriptPath = path.join(rootDir, relativePath);
  const workerDir = path.dirname(scriptPath);
  let lastMessage = null;
  let clock = 1000;
  const context = vm.createContext({
    self: {
      postMessage(message) {
        lastMessage = message;
      },
    },
    Math,
    Float32Array,
    Uint8Array,
    Uint8ClampedArray,
    performance: {
      now: () => {
        clock += 0.25;
        return clock;
      },
    },
  });

  context.importScripts = (...references) => {
    references.forEach((reference) => {
      const importPath = path.resolve(workerDir, reference);

      assert.ok(
        importPath.startsWith(workerDir + path.sep),
        `worker import must stay inside project directory: ${reference}`,
      );

      vm.runInContext(fs.readFileSync(importPath, 'utf8'), context, {
        filename: path.relative(rootDir, importPath),
      });
    });
  };

  vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
    filename: relativePath,
  });

  return {
    dispatch(data) {
      lastMessage = null;
      context.self.onmessage({ data });
      return lastMessage;
    },
  };
}

const configTools = loadBrowserGlobal(path.join('002', 'config-tools.js'), 'FluidConfigTools');
const browserTools = loadBrowserGlobal(path.join('002', 'browser-tools.js'), 'FluidBrowserTools');
const fluidCoreTools = loadBrowserGlobal(path.join('002', 'fluid-core.js'), 'FluidCoreTools');
const fluidStateTools = loadBrowserGlobal(path.join('002', 'fluid-state.js'), 'FluidStateTools');
const presenterTools = loadBrowserGlobal(path.join('002', 'fluid-presenter.js'), 'FluidPresenterTools');
const replayTools = loadBrowserGlobal(path.join('002', 'replay-tools.js'), 'FluidReplayTools');
const scenarioTools = loadBrowserGlobal(path.join('002', 'scenario-tools.js'), 'FluidScenarioTools');
const telemetryTools = loadBrowserGlobal(path.join('002', 'telemetry-tools.js'), 'FluidTelemetryTools');

function createSettings(overrides = {}) {
  return {
    profile: 'balanced',
    preset: 'neon',
    displayMode: 'dye',
    scenario: scenarioTools.defaultScenario,
    resolution: 128,
    force: 1150,
    radius: 0.06,
    dissipation: 0.985,
    velocityDecay: 0.995,
    pressureIterations: 18,
    vorticity: 28,
    sourceStrength: 0.42,
    vectorOverlay: true,
    brushOverlay: true,
    obstacle: true,
    glow: true,
    traceOverlay: true,
    ...overrides,
  };
}

function createWorkerSettings(overrides = {}) {
  return createSettings({
    background: '#070806',
    palette: [
      [0.48, 1, 0.77],
      [0.95, 0.79, 0.3],
      [1, 0.37, 0.49],
    ],
    resolution: 24,
    pressureIterations: 8,
    vectorOverlay: true,
    ...overrides,
  });
}

function assertFiniteNumber(value, label) {
  assert.strictEqual(typeof value, 'number', `${label} must be a number`);
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

function testConfigRoundTrip() {
  const settings = createSettings({ runScenario: true, traceOverlay: false });
  const share = configTools.createShareParams(settings);
  const parsed = configTools.settingsFromShareParams(`#${share}`);

  assert.strictEqual(parsed.scenario, scenarioTools.defaultScenario);
  assert.strictEqual(parsed.runScenario, true);
  assert.strictEqual(parsed.vectorOverlay, true);
  assert.strictEqual(parsed.traceOverlay, false);

  const controls = configTools.controlsFromSettings(
    {
      preset: 'missing',
      displayMode: 'missing',
      resolution: 999,
      force: 9999,
      pressureIterations: -2,
      sourceStrength: 3,
      traceOverlay: false,
    },
    {
      presetSelect: 'neon',
      displaySelect: 'dye',
      resolutionSelect: '80',
      scenarioSelect: scenarioTools.defaultScenario,
      forceRange: '1150',
      radiusRange: '6',
      dissipationRange: '98.5',
      velocityDecayRange: '99.5',
      pressureRange: '14',
      swirlRange: '22',
      sourceRange: '42',
      traceToggle: true,
    },
    {
      profiles: ['performance', 'balanced', 'quality', 'diagnostic', 'custom'],
      presets: ['neon'],
      displayModes: ['dye'],
      resolutions: ['80', '96', '128', '160'],
      scenarios: [scenarioTools.defaultScenario],
    },
  );

  assert.strictEqual(controls.presetSelect, 'neon');
  assert.strictEqual(controls.forceRange, '2200');
  assert.strictEqual(controls.pressureRange, '6');
  assert.strictEqual(controls.sourceRange, '100');
  assert.strictEqual(controls.traceToggle, false);
}

function testFluidCoreContracts() {
  assert.strictEqual(fluidCoreTools.clamp(12, 0, 10), 10);
  assert.strictEqual(fluidCoreTools.clamp(-2, 0, 10), 0);
  assert.strictEqual(fluidCoreTools.percentile([], 0.95), 0);
  assert.strictEqual(fluidCoreTools.percentile([1, 3, 5], 0.5), 3);
  assert.strictEqual(fluidCoreTools.percentile([10, 20, 30, 40], 0.25), 17.5);
  assert.strictEqual(fluidCoreTools.index2D(3, 2, 10), 23);
  assert.deepStrictEqual(Array.from(fluidCoreTools.parseHexColor('#123456')), [18, 52, 86]);
  assert.deepStrictEqual(Array.from(fluidCoreTools.parseHexColor('bad', '#070806')), [7, 8, 6]);

  const histogram = fluidCoreTools.buildTimingHistogram([1, 4, 7, 12, 20, 44, 70]);
  assert.deepStrictEqual(Array.from(histogram, (bucket) => bucket.count), [1, 2, 1, 1, 1, 1]);

  const summary = fluidCoreTools.summarizeStepTimings([4, 8, 12, 16]);
  assert.strictEqual(summary.totalStepMs, 40);
  assert.strictEqual(summary.avgStepMs, 10);
  assert.strictEqual(summary.medianStepMs, 10);
  assert.strictEqual(summary.worstStepMs, 16);
  assert.ok(summary.p95StepMs > summary.medianStepMs);
  assert.ok(summary.stabilityScore > 0 && summary.stabilityScore <= 100);
  assert.deepStrictEqual(
    Array.from(fluidCoreTools.hsvToRgb(0, 1, 1), (value) => Math.round(value)),
    [255, 0, 0],
  );

  const mask = fluidCoreTools.buildObstacleMask(32);
  const center = fluidCoreTools.index2D(16, 17, 32);
  const corner = fluidCoreTools.index2D(0, 0, 32);
  const solidCount = Array.from(mask.solid).reduce((sum, value) => sum + value, 0);
  const rimCount = Array.from(mask.rim).reduce((sum, value) => sum + value, 0);

  assert.strictEqual(mask.solid.length, 32 * 32);
  assert.strictEqual(mask.fade.length, 32 * 32);
  assert.strictEqual(mask.rim.length, 32 * 32);
  assert.strictEqual(mask.solid[center], 1);
  assert.strictEqual(mask.fade[center], 0);
  assert.strictEqual(mask.fade[corner], 1);
  assert.ok(solidCount > 0);
  assert.ok(rimCount > 0 && rimCount < solidCount);
}

function testFluidStateContracts() {
  const state = fluidStateTools.createState();
  const mask = fluidCoreTools.buildObstacleMask(8);

  assert.strictEqual(state.size, 0);
  assert.strictEqual(state.vx, null);

  fluidStateTools.allocateState(state, 8, mask);

  assert.strictEqual(state.size, 8);
  assert.deepStrictEqual(Array.from(fluidStateTools.fieldNames).slice(0, 4), ['vx', 'vy', 'vx0', 'vy0']);
  assert.strictEqual(state.vx.length, 64);
  assert.strictEqual(state.r.length, 64);
  assert.strictEqual(state.obstacleSolid.length, 64);
  assert.strictEqual(fluidStateTools.stateIndex(state, 3, 2), 19);

  state.vx[19] = 1.5;
  state.r[19] = 4.25;
  const snapshot = fluidStateTools.snapshotState(state);

  assert.strictEqual(snapshot.size, 8);
  assert.strictEqual(snapshot.vx[19], 1.5);
  assert.strictEqual(snapshot.r[19], 4.25);

  fluidStateTools.clearStateFields(state);
  assert.strictEqual(state.vx[19], 0);
  assert.strictEqual(state.r[19], 0);

  fluidStateTools.restoreState(state, snapshot, fluidCoreTools.buildObstacleMask);
  assert.strictEqual(state.vx[19], 1.5);
  assert.strictEqual(state.r[19], 4.25);

  const sameState = fluidStateTools.ensureStateSize(state, 8, fluidCoreTools.buildObstacleMask);
  assert.strictEqual(sameState, state);
  fluidStateTools.ensureStateSize(state, 4, fluidCoreTools.buildObstacleMask);
  assert.strictEqual(state.size, 4);
  assert.strictEqual(state.vx.length, 16);
}

function testPresenterContracts() {
  assert.deepStrictEqual(Array.from(presenterTools.hexToRgb('#7cffc4')), [124 / 255, 1, 196 / 255]);
  assert.deepStrictEqual(Array.from(presenterTools.hexToRgb('bad')), [1, 1, 1]);

  const point = presenterTools.pointFromRect(
    { clientX: 140, clientY: 80 },
    { left: 100, top: 20, width: 80, height: 120 },
  );

  assert.deepStrictEqual({ ...point }, { x: 0.5, y: 0.5 });

  const clampedPoint = presenterTools.pointFromRect(
    { clientX: -10, clientY: 999 },
    { left: 100, top: 20, width: 80, height: 120 },
  );

  assert.deepStrictEqual({ ...clampedPoint }, { x: 0, y: 1 });

  const splat = presenterTools.createSplat({
    x: 2,
    y: -1,
    dx: 4,
    dy: -4,
    pressure: 9,
    palette: ['#000000', '#ffffff'],
    random: () => 0.75,
  });

  assert.deepStrictEqual({
    ...splat,
    color: Array.from(splat.color),
  }, {
    x: 1,
    y: 0,
    dx: 1,
    dy: -1,
    pressure: 2,
    color: [1, 1, 1],
  });
}

function createFakeDocument(copyResult = true) {
  const elements = [];
  const documentRef = {
    body: {
      appendChild(element) {
        element.appended = true;
        elements.push(element);
      },
    },
    createElement(tagName) {
      return {
        tagName: String(tagName).toUpperCase(),
        style: {},
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        select() {
          this.selected = true;
        },
        click() {
          this.clicked = true;
        },
        remove() {
          this.removed = true;
        },
      };
    },
    execCommand(command) {
      assert.strictEqual(command, 'copy');
      return copyResult;
    },
  };

  return { documentRef, elements };
}

async function testBrowserToolContracts() {
  assert.strictEqual(browserTools.getShortcutAction({ key: ' ', target: { tagName: 'body' } }), 'pause');
  assert.strictEqual(browserTools.getShortcutAction({ key: 'R', target: { tagName: 'body' } }), 'randomize');
  assert.strictEqual(browserTools.getShortcutAction({ key: 'd', target: { tagName: 'input' } }), null);
  assert.strictEqual(browserTools.getShortcutAction({ key: 'b', target: { tagName: 'body' }, ctrlKey: true }), null);
  assert.strictEqual(browserTools.isEditableShortcutTarget({ tagName: 'textarea' }), true);

  let clipboardText = '';
  const clipboardCopied = await browserTools.copyText('share-link', {
    documentRef: createFakeDocument().documentRef,
    navigatorRef: {
      clipboard: {
        writeText: async (text) => {
          clipboardText = text;
        },
      },
    },
  });

  assert.strictEqual(clipboardCopied, true);
  assert.strictEqual(clipboardText, 'share-link');

  const fallbackDocument = createFakeDocument();
  const fallbackCopied = await browserTools.copyText('report', {
    documentRef: fallbackDocument.documentRef,
    navigatorRef: {
      clipboard: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    },
  });

  assert.strictEqual(fallbackCopied, true);
  assert.strictEqual(fallbackDocument.elements[0].value, 'report');
  assert.strictEqual(fallbackDocument.elements[0].selected, true);
  assert.strictEqual(fallbackDocument.elements[0].removed, true);

  const downloadDocument = createFakeDocument();
  let revokedUrl = '';
  browserTools.downloadBlob('fluid.json', { type: 'application/json' }, {
    documentRef: downloadDocument.documentRef,
    urlApi: {
      createObjectURL: () => 'blob:fluid',
      revokeObjectURL: (url) => {
        revokedUrl = url;
      },
    },
    setTimer: (callback) => callback(),
    revokeDelayMs: 0,
  });

  assert.strictEqual(downloadDocument.elements[0].href, 'blob:fluid');
  assert.strictEqual(downloadDocument.elements[0].download, 'fluid.json');
  assert.strictEqual(downloadDocument.elements[0].clicked, true);
  assert.strictEqual(downloadDocument.elements[0].removed, true);
  assert.strictEqual(revokedUrl, 'blob:fluid');
}

function testScenarioDeterminism() {
  const settings = createSettings({ resolution: 80 });
  const scenario = scenarioTools.getScenario('spiral-bloom');
  const splatsA = scenarioTools.generateSplats(scenario.id, scenario.duration / 3, settings);
  const splatsB = scenarioTools.generateSplats(scenario.id, scenario.duration / 3, settings);

  assert.ok(splatsA.length > 0, 'scenario must generate splats while active');
  assert.strictEqual(JSON.stringify(splatsA), JSON.stringify(splatsB), 'scenario splats must be deterministic');
  assert.strictEqual(scenarioTools.generateSplats(scenario.id, scenario.duration + 1, settings).length, 0);
  assert.strictEqual(scenarioTools.normalizeScenarioId('bad-id'), scenarioTools.defaultScenario);
}

function testTelemetryAdviceAndTune() {
  const settings = createSettings();
  const state = telemetryTools.createTelemetryState(12, 0, 3);

  telemetryTools.recordFrame(state, { stepMs: 70, maxDensity: 1, maxSpeed: 0.2, avgDivergence: 0.01 }, 30, settings);
  telemetryTools.recordFrame(state, { stepMs: 82, maxDensity: 1, maxSpeed: 0.2, avgDivergence: 0.01 }, 28, settings);
  const telemetry = telemetryTools.recordFrame(state, { stepMs: 96, maxDensity: 1, maxSpeed: 0.2, avgDivergence: 0.01 }, 24, settings);
  const advice = telemetryTools.buildPerformanceAdvice(settings, telemetry, null);
  const tuned = telemetryTools.createTunedControlValues(settings, telemetry, null);

  assert.strictEqual(telemetry.stable, true);
  assert.strictEqual(advice.severity, 'hot');
  assert.strictEqual(advice.source, 'telemetry');
  assert.strictEqual(tuned.changed, true);
  assert.ok(Number(tuned.controlValues.pressureRange) < settings.pressureIterations);
  assert.strictEqual(tuned.controlValues.vectorToggle, false);
}

function testReplayTraceContract() {
  const state = replayTools.createTraceState(3);

  replayTools.beginRecording(state, 1000);
  replayTools.recordSplat(state, { x: 0.25, y: 0.3, dx: 0.02, dy: -0.01, pressure: 0.8, color: [1, 0.2, 0.3] }, 1016);
  replayTools.recordSplat(state, { x: 0.75, y: 0.6, dx: -0.04, dy: 0.03, pressure: 0.9, color: [0.2, 1, 0.7] }, 1080);
  const trace = replayTools.finishRecording(state, 1120);
  const analysis = replayTools.analyzeTrace(trace);
  const replay = replayTools.createReplayState(trace, 2000);
  const first = replayTools.collectReplaySplats(replay, 2016);
  const second = replayTools.collectReplaySplats(replay, 2120);

  assert.strictEqual(trace.events.length, 2);
  assert.strictEqual(trace.durationMs, 120);
  assert.strictEqual(analysis.events, 2);
  assert.strictEqual(analysis.peakPressure, 0.9);
  assert.ok(analysis.totalTravel > 0);
  assert.ok(analysis.bounds.minX < analysis.bounds.maxX);
  assert.match(analysis.fingerprint, /^trc-[0-9a-f]{8}$/);
  assert.strictEqual(analysis.fingerprint, replayTools.createTraceFingerprint(trace));
  assert.strictEqual(first.splats.length, 1);
  assert.strictEqual(second.splats.length, 1);
  assert.strictEqual(second.completed, true);
  assert.strictEqual(JSON.stringify(first.splats[0].color), JSON.stringify([1, 0.2, 0.3]));
}

function testExportAndReportContract() {
  const settings = createSettings();
  const replayTrace = {
    version: 1,
    durationMs: 120,
    events: [
      { timeMs: 16, x: 0.25, y: 0.3, dx: 0.02, dy: -0.01, pressure: 0.8, color: [1, 0.2, 0.3] },
      { timeMs: 80, x: 0.75, y: 0.6, dx: -0.04, dy: 0.03, pressure: 0.9, color: [0.2, 1, 0.7] },
    ],
  };
  const performanceAdvice = telemetryTools.buildPerformanceAdvice(
    settings,
    { stable: true, samples: 24, p95StepMs: 92, budgetMs: 60, budgetLabel: 'Budget Hot' },
    null,
  );
  const payload = configTools.createExportPayload({
    settings,
    replayTrace,
    performanceAdvice,
    frames: 42,
  });
  const mismatchIntegrity = configTools.validateReplayPayload({
    replayTrace,
    replayAnalysis: {
      fingerprint: 'trc-deadbeef',
    },
  });
  const report = configTools.buildTechnicalReport({
    settings,
    replayTrace,
    replayAnalysis: payload.replayAnalysis,
    performanceAdvice,
    displayLabels: { dye: 'Dye Field' },
    scenarioLabels: { [scenarioTools.defaultScenario]: 'Twin Vortex' },
    shareUrl: 'https://example.test/projects/002/index.html#v=1',
  });

  assert.strictEqual(payload.replayTrace.events.length, 2);
  assert.strictEqual(payload.replayAnalysis.events, 2);
  assert.strictEqual(payload.replayAnalysis.peakPressure, 0.9);
  assert.match(payload.replayAnalysis.fingerprint, /^trc-[0-9a-f]{8}$/);
  assert.strictEqual(payload.replayAnalysis.fingerprint, configTools.createReplayFingerprint(replayTrace));
  assert.strictEqual(payload.replayIntegrity.status, 'verified');
  assert.strictEqual(mismatchIntegrity.status, 'mismatch');
  assert.strictEqual(mismatchIntegrity.verified, false);
  assert.strictEqual(payload.frames, 42);
  assert.ok(report.includes('Performance advice:'));
  assert.ok(report.includes('Replay trace: 2 input events over 0.1 s, peak 0.90'));
  assert.ok(report.includes('Replay bounds: 25-75 x / 30-60 y'));
  assert.ok(report.includes(`Replay fingerprint: ${payload.replayAnalysis.fingerprint}`));
  assert.ok(report.includes(`Replay integrity: Verified (${payload.replayAnalysis.fingerprint})`));
  assert.ok(report.includes('Share link: https://example.test/projects/002/index.html#v=1'));
}

function testWorkerMessageContract() {
  const worker = createWorkerContext(path.join('002', 'fluid-worker.js'));
  const settings = createWorkerSettings();
  const frame = worker.dispatch({
    type: 'step',
    settings,
    splats: [
      {
        x: 0.52,
        y: 0.48,
        dx: 0.018,
        dy: -0.012,
        pressure: 0.95,
        color: settings.palette[0],
      },
    ],
    dt: 0.016,
    time: 1.25,
  });

  assert.strictEqual(frame.type, 'frame');
  assert.strictEqual(frame.width, settings.resolution);
  assert.strictEqual(frame.height, settings.resolution);
  assert.ok(frame.pixels instanceof ArrayBuffer);
  assert.ok(frame.vectorSamples instanceof ArrayBuffer);
  ['stepMs', 'maxDensity', 'maxSpeed', 'avgDivergence'].forEach((metric) => {
    assertFiniteNumber(frame.diagnostics[metric], `worker diagnostic ${metric}`);
  });

  const pixels = new Uint8ClampedArray(frame.pixels);
  let energy = 0;

  assert.strictEqual(pixels.length, settings.resolution * settings.resolution * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    assert.strictEqual(pixels[index + 3], 255);
    energy += pixels[index] + pixels[index + 1] + pixels[index + 2];
  }

  assert.ok(energy > 0, 'worker frame must not be black');

  const benchmark = worker.dispatch({
    type: 'benchmark',
    settings,
    frames: 12,
  });

  assert.strictEqual(benchmark.type, 'benchmark');
  assert.strictEqual(benchmark.frames, 12);
  assert.strictEqual(benchmark.resolution, settings.resolution);
  ['avgStepMs', 'medianStepMs', 'p95StepMs', 'worstStepMs', 'stdDevStepMs', 'stabilityScore', 'totalStepMs'].forEach((metric) => {
    assertFiniteNumber(benchmark[metric], `worker benchmark ${metric}`);
  });
  assert.ok(benchmark.p95StepMs >= benchmark.medianStepMs);
  assert.ok(benchmark.worstStepMs >= benchmark.p95StepMs);
  assert.ok(Array.isArray(benchmark.histogram));
  assert.strictEqual(
    benchmark.histogram.reduce((sum, bucket) => sum + bucket.count, 0),
    benchmark.frames,
  );
}

async function run() {
  testConfigRoundTrip();
  testFluidCoreContracts();
  testFluidStateContracts();
  testPresenterContracts();
  await testBrowserToolContracts();
  testScenarioDeterminism();
  testTelemetryAdviceAndTune();
  testReplayTraceContract();
  testExportAndReportContract();
  testWorkerMessageContract();

  console.log('Project 002 unit tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
