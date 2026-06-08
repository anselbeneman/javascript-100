(function startTerrainGenerator() {
  'use strict';

  const canvas = document.getElementById('terrainCanvas');
  const sampleMarker = document.getElementById('sampleMarker');
  const statusValue = document.getElementById('statusValue');
  const presetSelect = document.getElementById('presetSelect');
  const seedInput = document.getElementById('seedInput');
  const seedButton = document.getElementById('seedButton');
  const generateButton = document.getElementById('generateButton');
  const randomButton = document.getElementById('randomButton');
  const exportButton = document.getElementById('exportButton');
  const copyButton = document.getElementById('copyButton');
  const sizeSelect = document.getElementById('sizeSelect');
  const scaleRange = document.getElementById('scaleRange');
  const scaleValue = document.getElementById('scaleValue');
  const seaLevelRange = document.getElementById('seaLevelRange');
  const seaLevelValue = document.getElementById('seaLevelValue');
  const reliefRange = document.getElementById('reliefRange');
  const reliefValue = document.getElementById('reliefValue');
  const erosionRange = document.getElementById('erosionRange');
  const erosionValue = document.getElementById('erosionValue');
  const warpRange = document.getElementById('warpRange');
  const warpValue = document.getElementById('warpValue');
  const octavesRange = document.getElementById('octavesRange');
  const octavesValue = document.getElementById('octavesValue');
  const riverRange = document.getElementById('riverRange');
  const riverValue = document.getElementById('riverValue');
  const shadeToggle = document.getElementById('shadeToggle');
  const contourToggle = document.getElementById('contourToggle');
  const autoToggle = document.getElementById('autoToggle');
  const landMetric = document.getElementById('landMetric');
  const peakMetric = document.getElementById('peakMetric');
  const renderMetric = document.getElementById('renderMetric');
  const gridMetric = document.getElementById('gridMetric');
  const seedMetric = document.getElementById('seedMetric');
  const pointerValue = document.getElementById('pointerValue');
  const heightValue = document.getElementById('heightValue');
  const moistureValue = document.getElementById('moistureValue');
  const slopeValue = document.getElementById('slopeValue');
  const biomeValue = document.getElementById('biomeValue');

  const ctx = canvas.getContext('2d', { alpha: false });
  const rangeControls = [
    [scaleRange, scaleValue, 1],
    [seaLevelRange, seaLevelValue, 2],
    [reliefRange, reliefValue, 2],
    [erosionRange, erosionValue, 2],
    [warpRange, warpValue, 2],
    [octavesRange, octavesValue, 0],
    [riverRange, riverValue, 2],
  ];

  let worker = null;
  let activeJob = 0;
  let autoTimer = 0;
  let latestResult = null;

  function setStatus(text) {
    statusValue.textContent = text;
  }

  function updateRangeLabels() {
    rangeControls.forEach(([input, output, decimals]) => {
      output.textContent = Number(input.value).toFixed(decimals);
    });
  }

  function readConfig() {
    const preset = window.TerrainCore.presets[presetSelect.value] || window.TerrainCore.presets.alpine;

    return window.TerrainCore.normalizeConfig({
      preset: presetSelect.value,
      seed: seedInput.value.trim() || preset.seed,
      size: Number(sizeSelect.value),
      scale: Number(scaleRange.value),
      seaLevel: Number(seaLevelRange.value),
      relief: Number(reliefRange.value),
      erosion: Number(erosionRange.value),
      warp: Number(warpRange.value),
      octaves: Number(octavesRange.value),
      rivers: Number(riverRange.value),
      shade: shadeToggle.checked,
      contours: contourToggle.checked,
    });
  }

  function applyPreset(name) {
    const preset = window.TerrainCore.presets[name] || window.TerrainCore.presets.alpine;
    presetSelect.value = name;
    seedInput.value = preset.seed;
    scaleRange.value = preset.scale;
    seaLevelRange.value = preset.seaLevel;
    reliefRange.value = preset.relief;
    erosionRange.value = preset.erosion;
    warpRange.value = preset.warp;
    octavesRange.value = preset.octaves;
    riverRange.value = preset.rivers;
    updateRangeLabels();
  }

  function updateMetrics(result) {
    landMetric.textContent = `${Math.round(result.stats.landRatio * 100)}%`;
    peakMetric.textContent = result.stats.peakCount.toLocaleString('en-US');
    renderMetric.textContent = `${result.stats.renderMs.toFixed(1)} ms`;
    gridMetric.textContent = `${result.stats.width} x ${result.stats.height}`;
    seedMetric.textContent = result.stats.seedHash;
  }

  function drawResult(result) {
    canvas.width = result.stats.width;
    canvas.height = result.stats.height;

    const imageData = new ImageData(
      new Uint8ClampedArray(result.pixels),
      result.stats.width,
      result.stats.height,
    );

    ctx.putImageData(imageData, 0, 0);
    latestResult = result;
    updateMetrics(result);
    setStatus('Ready');
  }

  function createResultFromMessage(message) {
    return {
      pixels: new Uint8ClampedArray(message.pixels),
      heightMap: new Float32Array(message.heightMap),
      moistureMap: new Float32Array(message.moistureMap),
      slopeMap: new Float32Array(message.slopeMap),
      config: message.config,
      stats: message.stats,
    };
  }

  function ensureWorker() {
    if (worker || typeof Worker === 'undefined') {
      return worker;
    }

    worker = new Worker('terrain-worker.js');
    worker.onmessage = function handleWorkerMessage(event) {
      const message = event.data || {};

      if (message.jobId !== activeJob) {
        return;
      }

      if (message.type === 'error') {
        setStatus(message.message || 'Generation failed');
        return;
      }

      if (message.type === 'terrain') {
        drawResult(createResultFromMessage(message));
      }
    };

    worker.onerror = function handleWorkerError(error) {
      setStatus(error && error.message ? error.message : 'Worker failed');
    };

    return worker;
  }

  function generateTerrain() {
    const config = readConfig();
    activeJob += 1;
    setStatus('Generating');

    const terrainWorker = ensureWorker();
    if (terrainWorker) {
      terrainWorker.postMessage({
        type: 'render',
        jobId: activeJob,
        config,
      });
      return;
    }

    window.setTimeout(() => {
      const result = window.TerrainCore.renderTerrain(config);
      if (activeJob > 0) {
        drawResult(result);
      }
    }, 0);
  }

  function scheduleGenerate() {
    updateRangeLabels();

    if (!autoToggle.checked) {
      return;
    }

    window.clearTimeout(autoTimer);
    autoTimer = window.setTimeout(generateTerrain, 140);
  }

  function updateSample(event) {
    if (!latestResult) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;

    if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
      sampleMarker.classList.remove('is-visible');
      return;
    }

    const x = xRatio * (latestResult.stats.width - 1);
    const y = yRatio * (latestResult.stats.height - 1);
    const sample = window.TerrainCore.sampleAt(latestResult, x, y);

    if (!sample) {
      return;
    }

    const frameRect = canvas.parentElement.getBoundingClientRect();
    sampleMarker.style.left = `${event.clientX - frameRect.left}px`;
    sampleMarker.style.top = `${event.clientY - frameRect.top}px`;
    sampleMarker.classList.add('is-visible');

    pointerValue.textContent = `${sample.x}, ${sample.y}`;
    heightValue.textContent = sample.elevation.toFixed(3);
    moistureValue.textContent = sample.moisture.toFixed(3);
    slopeValue.textContent = sample.slope.toFixed(3);
    biomeValue.textContent = sample.biome;
  }

  function clearSample() {
    sampleMarker.classList.remove('is-visible');
  }

  function randomizeSeed() {
    seedInput.value = window.TerrainCore.createSeed(presetSelect.value);
    generateTerrain();
  }

  function exportPng() {
    if (!latestResult) {
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `terrain-${latestResult.config.seed}-${latestResult.stats.width}.png`;
    link.click();
  }

  function downloadJson(payload) {
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'terrain-config.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function copyJson() {
    if (!latestResult) {
      return;
    }

    const payload = JSON.stringify(
      {
        project: '005 - Procedural Terrain Generator',
        config: latestResult.config,
        stats: latestResult.stats,
      },
      null,
      2,
    );

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload)
        .then(() => setStatus('JSON copied'))
        .catch(() => downloadJson(payload));
      return;
    }

    downloadJson(payload);
  }

  function isTypingTarget(target) {
    return ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName);
  }

  function handleKeydown(event) {
    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.key.toLowerCase() === 'g') {
      generateTerrain();
    }

    if (event.key.toLowerCase() === 'r') {
      randomizeSeed();
    }

    if (event.key.toLowerCase() === 'p') {
      exportPng();
    }
  }

  rangeControls.forEach(([input]) => {
    input.addEventListener('input', scheduleGenerate);
  });

  [shadeToggle, contourToggle, autoToggle, sizeSelect, seedInput].forEach((input) => {
    input.addEventListener('change', scheduleGenerate);
  });

  presetSelect.addEventListener('change', () => {
    applyPreset(presetSelect.value);
    generateTerrain();
  });
  seedButton.addEventListener('click', randomizeSeed);
  randomButton.addEventListener('click', randomizeSeed);
  generateButton.addEventListener('click', generateTerrain);
  exportButton.addEventListener('click', exportPng);
  copyButton.addEventListener('click', copyJson);
  canvas.addEventListener('pointermove', updateSample);
  canvas.addEventListener('pointerleave', clearSample);
  window.addEventListener('keydown', handleKeydown);

  updateRangeLabels();
  generateTerrain();
}());
