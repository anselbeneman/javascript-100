(function runParticleSandbox() {
  'use strict';

  const core = window.ParticlePhysicsCore;
  const tools = window.ParticlePhysicsTools;
  const canvasFrame = document.getElementById('canvasFrame');
  const canvas = document.getElementById('particleCanvas');
  const context = canvas.getContext('2d');

  if (!core || !tools || !context) {
    const status = document.getElementById('statusValue');
    if (status) {
      status.textContent = !core ? 'Core failed' : !tools ? 'Tools failed' : 'Canvas failed';
    }
    throw new Error('Particle sandbox failed to boot');
  }

  const controls = {
    presetSelect: document.getElementById('presetSelect'),
    pointerModeSelect: document.getElementById('pointerModeSelect'),
    pauseButton: document.getElementById('pauseButton'),
    resetButton: document.getElementById('resetButton'),
    randomizeButton: document.getElementById('randomizeButton'),
    spawnButton: document.getElementById('spawnButton'),
    benchmarkButton: document.getElementById('benchmarkButton'),
    shareButton: document.getElementById('shareButton'),
    exportButton: document.getElementById('exportButton'),
    importButton: document.getElementById('importButton'),
    reportButton: document.getElementById('reportButton'),
    importFile: document.getElementById('importFile'),
    countRange: document.getElementById('countRange'),
    radiusRange: document.getElementById('radiusRange'),
    gravityRange: document.getElementById('gravityRange'),
    dragRange: document.getElementById('dragRange'),
    restitutionRange: document.getElementById('restitutionRange'),
    pointerForceRange: document.getElementById('pointerForceRange'),
    collisionToggle: document.getElementById('collisionToggle'),
    trailToggle: document.getElementById('trailToggle'),
    gridToggle: document.getElementById('gridToggle'),
  };

  const labels = {
    countValue: document.getElementById('countValue'),
    radiusValue: document.getElementById('radiusValue'),
    gravityValue: document.getElementById('gravityValue'),
    dragValue: document.getElementById('dragValue'),
    restitutionValue: document.getElementById('restitutionValue'),
    pointerForceValue: document.getElementById('pointerForceValue'),
    fpsValue: document.getElementById('fpsValue'),
    particlesValue: document.getElementById('particlesValue'),
    energyValue: document.getElementById('energyValue'),
    stepValue: document.getElementById('stepValue'),
    checksValue: document.getElementById('checksValue'),
    collisionsValue: document.getElementById('collisionsValue'),
    cellsValue: document.getElementById('cellsValue'),
    entropyValue: document.getElementById('entropyValue'),
    statusValue: document.getElementById('statusValue'),
    benchmarkValue: document.getElementById('benchmarkValue'),
    presetBadge: document.getElementById('presetBadge'),
    interactionBadge: document.getElementById('interactionBadge'),
    seedValue: document.getElementById('seedValue'),
  };

  const pointer = {
    active: false,
    down: false,
    x: 0,
    y: 0,
    mode: 'attract',
  };

  let seed = createSeed();
  let world = null;
  let paused = false;
  let lastFrameTime = performance.now();
  let lastMetricTime = performance.now();
  let fpsAccumulator = 0;
  let fpsSamples = 0;
  let fps = 0;
  let stepMs = 0;
  let latestBenchmark = null;

  function createSeed() {
    return Math.floor((Date.now() % 1000000) + Math.random() * 1000000) >>> 0;
  }

  function readCanvasLayoutSize() {
    const bounds = canvasFrame.getBoundingClientRect();
    return {
      width: Math.max(320, Math.round(bounds.width)),
      height: Math.max(260, Math.round(bounds.height)),
    };
  }

  function readSettings() {
    const layoutSize = readCanvasLayoutSize();

    return core.normalizeSettings({
      preset: controls.presetSelect.value,
      width: world ? world.width : layoutSize.width,
      height: world ? world.height : layoutSize.height,
      count: Number(controls.countRange.value),
      radius: Number(controls.radiusRange.value),
      gravity: Number(controls.gravityRange.value) / 100,
      drag: Number(controls.dragRange.value) / 1000,
      restitution: Number(controls.restitutionRange.value) / 100,
      pointerForce: Number(controls.pointerForceRange.value) / 100,
      pointerMode: controls.pointerModeSelect.value,
      collisions: controls.collisionToggle.checked,
      trails: controls.trailToggle.checked,
      showGrid: controls.gridToggle.checked,
    });
  }

  function applyPresetControls(presetId) {
    const preset = core.presets[presetId] || core.presets.orbit;
    controls.countRange.value = String(preset.count);
    controls.radiusRange.value = String(preset.radius);
    controls.gravityRange.value = String(Math.round(preset.gravity * 100));
    controls.dragRange.value = String(Math.round(preset.drag * 1000));
    controls.restitutionRange.value = String(Math.round(preset.restitution * 100));
    controls.pointerForceRange.value = String(Math.round(preset.pointerForce * 100));
    updateControlLabels();
  }

  function applyControlValues(values) {
    controls.presetSelect.value = values.presetSelect;
    controls.pointerModeSelect.value = values.pointerModeSelect;
    controls.countRange.value = values.countRange;
    controls.radiusRange.value = values.radiusRange;
    controls.gravityRange.value = values.gravityRange;
    controls.dragRange.value = values.dragRange;
    controls.restitutionRange.value = values.restitutionRange;
    controls.pointerForceRange.value = values.pointerForceRange;
    controls.collisionToggle.checked = values.collisionToggle;
    controls.trailToggle.checked = values.trailToggle;
    controls.gridToggle.checked = values.gridToggle;
    updateControlLabels();
  }

  function updateControlLabels() {
    labels.countValue.textContent = controls.countRange.value;
    labels.radiusValue.textContent = `${Number(controls.radiusRange.value).toFixed(1)} px`;
    labels.gravityValue.textContent = (Number(controls.gravityRange.value) / 100).toFixed(2);
    labels.dragValue.textContent = (Number(controls.dragRange.value) / 1000).toFixed(3);
    labels.restitutionValue.textContent = (Number(controls.restitutionRange.value) / 100).toFixed(2);
    labels.pointerForceValue.textContent = (Number(controls.pointerForceRange.value) / 100).toFixed(2);
  }

  function resizeCanvas() {
    const { width, height } = readCanvasLayoutSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (world) {
        core.resizeWorld(world, width, height);
      }
      clearCanvas(false);
    }
  }

  function resetWorld(statusText) {
    const settings = readSettings();
    world = core.createWorld(settings, seed);
    resizeCanvas();
    labels.statusValue.textContent = statusText || 'Reset';
    labels.seedValue.textContent = `Seed ${seed}`;
    clearCanvas(false);
  }

  function applyImportedState(imported, statusText) {
    seed = imported.seed;
    applyControlValues(imported.controls);
    latestBenchmark = null;
    labels.benchmarkValue.textContent = 'Not run';
    resetWorld(statusText || 'Imported');
  }

  function randomizeWorld() {
    seed = createSeed();
    resetWorld('Randomized');
  }

  function pauseToggle() {
    paused = !paused;
    controls.pauseButton.textContent = paused ? 'Resume' : 'Pause';
    labels.statusValue.textContent = paused ? 'Paused' : 'Running';
  }

  function pointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) * (world.width / rect.width);
    pointer.y = (event.clientY - rect.top) * (world.height / rect.height);
    pointer.mode = controls.pointerModeSelect.value;
  }

  function spawnBurstAt(x, y) {
    const changed = core.createBurst(world, readSettings(), x, y, Math.round(world.particles.length / 12), 520, seed + world.frame);
    labels.statusValue.textContent = `Burst ${changed}`;
  }

  function downloadText(filename, mimeType, text) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text, fallbackFilename, statusText) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      labels.statusValue.textContent = statusText;
      return;
    }

    downloadText(fallbackFilename, 'text/plain;charset=utf-8', text);
    labels.statusValue.textContent = 'Downloaded fallback';
  }

  function createCurrentPayload() {
    const settings = readSettings();

    return tools.createExportPayload({
      settings,
      seed,
      metrics: world.metrics,
      benchmark: latestBenchmark,
    });
  }

  function exportJson() {
    const payload = createCurrentPayload();
    const filename = `particle-sandbox-${payload.fingerprint}.json`;

    downloadText(filename, 'application/json;charset=utf-8', `${JSON.stringify(payload, null, 2)}\n`);
    labels.statusValue.textContent = 'JSON exported';
  }

  function importJsonFile(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const imported = tools.normalizeImportPayload(String(reader.result || ''), core);
        applyImportedState(imported, 'JSON imported');
      } catch (error) {
        labels.statusValue.textContent = 'Import failed';
      }
    });
    reader.readAsText(file);
  }

  function runBenchmark() {
    const settings = readSettings();

    labels.statusValue.textContent = 'Benchmarking';
    latestBenchmark = tools.runBenchmark(core, settings, {
      seed,
      frames: 150,
      warmup: 18,
      width: Math.max(640, Math.round(world.width)),
      height: Math.max(360, Math.round(world.height)),
    });
    labels.benchmarkValue.textContent = `P95 ${latestBenchmark.p95StepMs} ms`;
    labels.statusValue.textContent = `Bench ${latestBenchmark.stabilityScore}/100`;
  }

  async function copyShareLink() {
    const settings = readSettings();
    const url = `${window.location.origin}${window.location.pathname}${tools.createShareHash(settings, seed)}`;

    await copyText(url, 'particle-sandbox-link.txt', 'Link copied');
    window.history.replaceState(null, '', tools.createShareHash(settings, seed));
  }

  async function copyTechnicalReport() {
    const settings = readSettings();
    const report = tools.buildTechnicalReport({
      settings,
      seed,
      metrics: world.metrics,
      benchmark: latestBenchmark,
    });

    await copyText(report, 'particle-sandbox-report.md', 'Report copied');
  }

  function clearCanvas(useTrail) {
    const size = world || readCanvasLayoutSize();

    if (useTrail) {
      context.fillStyle = 'rgba(7, 10, 12, 0.20)';
      context.fillRect(0, 0, size.width, size.height);
      return;
    }

    context.fillStyle = '#070a0c';
    context.fillRect(0, 0, size.width, size.height);
  }

  function drawGrid(metrics) {
    if (!controls.gridToggle.checked || !metrics.gridCellSize) {
      return;
    }

    const cell = metrics.gridCellSize;
    context.save();
    context.strokeStyle = 'rgba(136, 233, 210, 0.08)';
    context.lineWidth = 1;

    for (let x = 0; x < world.width; x += cell) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, world.height);
      context.stroke();
    }

    for (let y = 0; y < world.height; y += cell) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(world.width, y);
      context.stroke();
    }

    context.restore();
  }

  function drawPointer(settings) {
    if (!pointer.active || settings.pointerForce <= 0) {
      return;
    }

    const radius = 78 + settings.radius * 18 + settings.pointerForce * 36;
    context.save();
    context.strokeStyle = pointer.down ? 'rgba(255, 213, 92, 0.55)' : 'rgba(117, 229, 203, 0.34)';
    context.lineWidth = pointer.down ? 2 : 1;
    context.beginPath();
    context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawParticles(settings, metrics) {
    drawGrid(metrics);

    world.particles.forEach((particle) => {
      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      const alpha = Math.min(0.95, 0.48 + speed / 900 + particle.heat * 0.12);
      const lightness = Math.min(78, 44 + speed / 18 + particle.heat * 8);

      context.beginPath();
      context.fillStyle = `hsla(${particle.hue.toFixed(1)}, 82%, ${lightness.toFixed(1)}%, ${alpha.toFixed(3)})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });

    drawPointer(settings);
  }

  function updateBadges(settings) {
    labels.presetBadge.textContent = settings.label;
    labels.interactionBadge.textContent = `Pointer ${settings.pointerMode}`;
    labels.seedValue.textContent = `Seed ${seed}`;
  }

  function updateMetrics(metrics) {
    labels.fpsValue.textContent = String(Math.round(fps));
    labels.particlesValue.textContent = String(metrics.particles);
    labels.energyValue.textContent = formatCompact(metrics.averageEnergy);
    labels.stepValue.textContent = `${stepMs.toFixed(2)} ms`;
    labels.checksValue.textContent = formatCompact(metrics.checks);
    labels.collisionsValue.textContent = String(metrics.collisions);
    labels.cellsValue.textContent = String(metrics.gridCells);
    labels.entropyValue.textContent = metrics.spread.toFixed(2);
    labels.benchmarkValue.textContent = latestBenchmark ? `P95 ${latestBenchmark.p95StepMs} ms` : 'Not run';

    if (!paused) {
      labels.statusValue.textContent = stepMs > 10 ? 'Heavy frame' : 'Running';
    }
  }

  function formatCompact(value) {
    if (!Number.isFinite(value)) {
      return '0';
    }

    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    }

    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }

    return value.toFixed(value >= 100 ? 0 : 1);
  }

  function tick(now) {
    resizeCanvas();

    const settings = readSettings();
    const dt = Math.min(1 / 24, Math.max(1 / 240, (now - lastFrameTime) / 1000 || 1 / 60));
    lastFrameTime = now;

    if (!paused) {
      const start = performance.now();
      const metrics = core.stepSimulation(world, settings, dt, pointer);
      stepMs = performance.now() - start;
      fpsAccumulator += 1 / dt;
      fpsSamples += 1;

      if (now - lastMetricTime > 220) {
        fps = fpsAccumulator / Math.max(1, fpsSamples);
        fpsAccumulator = 0;
        fpsSamples = 0;
        lastMetricTime = now;
        updateMetrics(metrics);
      }
    }

    clearCanvas(settings.trails);
    drawParticles(settings, world.metrics);
    updateBadges(settings);
    window.requestAnimationFrame(tick);
  }

  function bindControls() {
    controls.presetSelect.addEventListener('change', () => {
      applyPresetControls(controls.presetSelect.value);
      seed = createSeed();
      resetWorld('Preset loaded');
    });

    [
      controls.countRange,
      controls.radiusRange,
      controls.gravityRange,
      controls.dragRange,
      controls.restitutionRange,
      controls.pointerForceRange,
    ].forEach((control) => {
      control.addEventListener('input', updateControlLabels);
    });

    controls.countRange.addEventListener('change', () => resetWorld('Particle count changed'));
    controls.radiusRange.addEventListener('change', () => resetWorld('Radius changed'));
    controls.pauseButton.addEventListener('click', pauseToggle);
    controls.resetButton.addEventListener('click', () => resetWorld('Reset'));
    controls.randomizeButton.addEventListener('click', randomizeWorld);
    controls.spawnButton.addEventListener('click', () => {
      spawnBurstAt(world.width * 0.5, world.height * 0.5);
    });
    controls.benchmarkButton.addEventListener('click', runBenchmark);
    controls.shareButton.addEventListener('click', () => {
      copyShareLink().catch(() => {
        labels.statusValue.textContent = 'Copy failed';
      });
    });
    controls.exportButton.addEventListener('click', exportJson);
    controls.importButton.addEventListener('click', () => controls.importFile.click());
    controls.importFile.addEventListener('change', () => {
      importJsonFile(controls.importFile.files[0]);
      controls.importFile.value = '';
    });
    controls.reportButton.addEventListener('click', () => {
      copyTechnicalReport().catch(() => {
        labels.statusValue.textContent = 'Copy failed';
      });
    });

    canvas.addEventListener('pointerenter', (event) => {
      pointer.active = true;
      pointerFromEvent(event);
    });
    canvas.addEventListener('pointermove', (event) => {
      pointer.active = true;
      pointerFromEvent(event);
    });
    canvas.addEventListener('pointerdown', (event) => {
      pointer.active = true;
      pointer.down = true;
      pointerFromEvent(event);
      canvas.setPointerCapture(event.pointerId);
      spawnBurstAt(pointer.x, pointer.y);
    });
    canvas.addEventListener('pointerup', (event) => {
      pointer.down = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerleave', () => {
      pointer.active = false;
      pointer.down = false;
    });

    window.addEventListener('keydown', (event) => {
      const tagName = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tagName)) {
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        pauseToggle();
      } else if (event.key.toLowerCase() === 'r') {
        resetWorld('Reset');
      } else if (event.key.toLowerCase() === 'x') {
        randomizeWorld();
      } else if (event.key.toLowerCase() === 'b') {
        spawnBurstAt(world.width * 0.5, world.height * 0.5);
      } else if (event.key.toLowerCase() === 'm') {
        runBenchmark();
      }
    });

    window.addEventListener('resize', resizeCanvas);
  }

  updateControlLabels();
  bindControls();
  resizeCanvas();
  const sharedState = tools.parseShareHash(window.location.hash, core);
  if (sharedState) {
    applyImportedState(sharedState, 'Shared state');
  } else {
    resetWorld('Running');
  }
  window.requestAnimationFrame(tick);
}());
