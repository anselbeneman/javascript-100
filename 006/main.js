(function startFractalExplorer() {
  'use strict';

  const core = window.FractalCore;
  const canvasFrame = document.getElementById('canvasFrame');
  const canvas = document.getElementById('fractalCanvas');
  const context = canvas.getContext('2d');
  const worker = new Worker('fractal-worker.js');

  const controls = {
    presetSelect: document.getElementById('presetSelect'),
    setSelect: document.getElementById('setSelect'),
    paletteSelect: document.getElementById('paletteSelect'),
    renderButton: document.getElementById('renderButton'),
    resetButton: document.getElementById('resetButton'),
    benchmarkButton: document.getElementById('benchmarkButton'),
    resolutionSelect: document.getElementById('resolutionSelect'),
    zoomRange: document.getElementById('zoomRange'),
    iterationsRange: document.getElementById('iterationsRange'),
    bailoutRange: document.getElementById('bailoutRange'),
    juliaXRange: document.getElementById('juliaXRange'),
    juliaYRange: document.getElementById('juliaYRange'),
    smoothToggle: document.getElementById('smoothToggle'),
    pngButton: document.getElementById('pngButton'),
    jsonButton: document.getElementById('jsonButton'),
    shareButton: document.getElementById('shareButton'),
  };

  const labels = {
    setBadge: document.getElementById('setBadge'),
    paletteBadge: document.getElementById('paletteBadge'),
    zoomBadge: document.getElementById('zoomBadge'),
    renderValue: document.getElementById('renderValue'),
    pixelsValue: document.getElementById('pixelsValue'),
    iterationsValue: document.getElementById('iterationsValue'),
    zoomValue: document.getElementById('zoomValue'),
    centerXValue: document.getElementById('centerXValue'),
    centerYValue: document.getElementById('centerYValue'),
    benchmarkValue: document.getElementById('benchmarkValue'),
    statusValue: document.getElementById('statusValue'),
    zoomControlValue: document.getElementById('zoomControlValue'),
    iterationsControlValue: document.getElementById('iterationsControlValue'),
    bailoutValue: document.getElementById('bailoutValue'),
    juliaXValue: document.getElementById('juliaXValue'),
    juliaYValue: document.getElementById('juliaYValue'),
  };

  let currentConfig = core.normalizeConfig({});
  let latestMetrics = null;
  let currentImage = null;
  let jobId = 0;

  function resolution() {
    const [width, height] = controls.resolutionSelect.value.split('x').map(Number);
    return { width, height };
  }

  function readConfig() {
    const size = resolution();
    return core.normalizeConfig({
      preset: controls.presetSelect.value,
      set: controls.setSelect.value,
      palette: controls.paletteSelect.value,
      width: size.width,
      height: size.height,
      centerX: currentConfig.centerX,
      centerY: currentConfig.centerY,
      zoomPower: Number(controls.zoomRange.value),
      iterations: Number(controls.iterationsRange.value),
      bailout: Number(controls.bailoutRange.value),
      juliaX: Number(controls.juliaXRange.value),
      juliaY: Number(controls.juliaYRange.value),
      smooth: controls.smoothToggle.checked,
    });
  }

  function applyConfigToControls(config) {
    controls.presetSelect.value = config.preset;
    controls.setSelect.value = config.set;
    controls.paletteSelect.value = config.palette;
    controls.zoomRange.value = String(config.zoomPower);
    controls.iterationsRange.value = String(config.iterations);
    controls.bailoutRange.value = String(config.bailout);
    controls.juliaXRange.value = String(config.juliaX);
    controls.juliaYRange.value = String(config.juliaY);
    controls.smoothToggle.checked = config.smooth;
    updateControlLabels();
  }

  function applyPreset() {
    const preset = core.presets[controls.presetSelect.value] || core.presets.cardioid;
    currentConfig = core.normalizeConfig({
      ...currentConfig,
      preset: controls.presetSelect.value,
      set: preset.set,
      centerX: preset.centerX,
      centerY: preset.centerY,
      zoomPower: preset.zoomPower,
      iterations: preset.iterations,
      juliaX: preset.juliaX,
      juliaY: preset.juliaY,
    });
    applyConfigToControls(currentConfig);
    requestRender('Preset loaded');
  }

  function updateControlLabels() {
    const zoom = core.zoomFromPower(Number(controls.zoomRange.value));
    labels.zoomControlValue.textContent = `${formatNumber(zoom)}x`;
    labels.iterationsControlValue.textContent = controls.iterationsRange.value;
    labels.bailoutValue.textContent = Number(controls.bailoutRange.value).toFixed(1);
    labels.juliaXValue.textContent = Number(controls.juliaXRange.value).toFixed(2);
    labels.juliaYValue.textContent = Number(controls.juliaYRange.value).toFixed(2);
  }

  function updateMetrics() {
    const zoom = core.zoomFromPower(currentConfig.zoomPower);
    labels.setBadge.textContent = currentConfig.set === 'julia' ? 'Julia' : 'Mandelbrot';
    labels.paletteBadge.textContent = titleCase(currentConfig.palette);
    labels.zoomBadge.textContent = `Zoom ${formatNumber(zoom)}x`;
    labels.renderValue.textContent = latestMetrics ? `${latestMetrics.renderMs.toFixed(1)} ms` : '0 ms';
    labels.pixelsValue.textContent = latestMetrics ? formatCompact(latestMetrics.pixels) : '0';
    labels.iterationsValue.textContent = String(currentConfig.iterations);
    labels.zoomValue.textContent = `${formatNumber(zoom)}x`;
    labels.centerXValue.textContent = currentConfig.centerX.toFixed(5);
    labels.centerYValue.textContent = currentConfig.centerY.toFixed(5);
  }

  function titleCase(value) {
    return String(value).slice(0, 1).toUpperCase() + String(value).slice(1);
  }

  function formatNumber(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
  }

  function formatCompact(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return String(Math.round(value));
  }

  function requestRender(statusText) {
    currentConfig = readConfig();
    labels.statusValue.textContent = statusText || 'Rendering';
    updateMetrics();
    worker.postMessage({
      type: 'render',
      jobId: jobId += 1,
      config: currentConfig,
    });
  }

  function drawFrame(width, height, pixels) {
    canvas.width = width;
    canvas.height = height;
    currentImage = new ImageData(new Uint8ClampedArray(pixels), width, height);
    context.putImageData(currentImage, 0, 0);
    fitCanvasToFrame();
  }

  function fitCanvasToFrame() {
    const bounds = canvasFrame.getBoundingClientRect();
    const aspect = currentConfig.width / currentConfig.height;
    const frameAspect = bounds.width / bounds.height;

    if (frameAspect > aspect) {
      canvas.style.height = `${Math.round(bounds.height)}px`;
      canvas.style.width = `${Math.round(bounds.height * aspect)}px`;
    } else {
      canvas.style.width = `${Math.round(bounds.width)}px`;
      canvas.style.height = `${Math.round(bounds.width / aspect)}px`;
    }
  }

  function canvasPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * currentConfig.width,
      y: ((event.clientY - rect.top) / rect.height) * currentConfig.height,
    };
  }

  function zoomAt(event) {
    const point = canvasPointFromEvent(event);
    const plane = core.pixelToPlane(currentConfig, point.x, point.y);
    const direction = event.shiftKey || event.button === 2 ? -1 : 1;

    currentConfig.centerX = plane.x;
    currentConfig.centerY = plane.y;
    currentConfig.zoomPower = core.clamp(currentConfig.zoomPower + direction * 0.45, 0, 12);
    controls.zoomRange.value = String(currentConfig.zoomPower);
    updateControlLabels();
    event.preventDefault();
    requestRender(direction > 0 ? 'Zoom in' : 'Zoom out');
  }

  function runBenchmark() {
    labels.statusValue.textContent = 'Benchmarking';
    worker.postMessage({
      type: 'benchmark',
      frames: 6,
      config: readConfig(),
    });
  }

  function resetView() {
    currentConfig = core.normalizeConfig({ preset: controls.presetSelect.value });
    applyConfigToControls(currentConfig);
    requestRender('Reset');
  }

  function copyText(text, filename, status) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => {
        labels.statusValue.textContent = status;
      });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    labels.statusValue.textContent = 'Downloaded';
    return Promise.resolve();
  }

  function exportPng() {
    canvas.toBlob((blob) => {
      if (!blob) {
        labels.statusValue.textContent = 'PNG failed';
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fractal-explorer-006.png';
      link.click();
      URL.revokeObjectURL(url);
      labels.statusValue.textContent = 'PNG exported';
    }, 'image/png');
  }

  function exportJson() {
    const payload = JSON.stringify(core.createExportPayload(currentConfig, latestMetrics), null, 2);
    copyText(payload, 'fractal-explorer-006.json', 'JSON copied').catch(() => {
      labels.statusValue.textContent = 'JSON failed';
    });
  }

  function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}${core.createShareHash(currentConfig)}`;
    window.history.replaceState(null, '', core.createShareHash(currentConfig));
    copyText(url, 'fractal-explorer-006-link.txt', 'Link copied').catch(() => {
      labels.statusValue.textContent = 'Link failed';
    });
  }

  function bindControls() {
    controls.presetSelect.addEventListener('change', applyPreset);
    controls.renderButton.addEventListener('click', () => requestRender('Rendering'));
    controls.resetButton.addEventListener('click', resetView);
    controls.benchmarkButton.addEventListener('click', runBenchmark);
    controls.pngButton.addEventListener('click', exportPng);
    controls.jsonButton.addEventListener('click', exportJson);
    controls.shareButton.addEventListener('click', copyShareLink);

    [
      controls.setSelect,
      controls.paletteSelect,
      controls.resolutionSelect,
      controls.zoomRange,
      controls.iterationsRange,
      controls.bailoutRange,
      controls.juliaXRange,
      controls.juliaYRange,
      controls.smoothToggle,
    ].forEach((control) => {
      control.addEventListener('input', updateControlLabels);
      control.addEventListener('change', () => requestRender('Rendering'));
    });

    canvas.addEventListener('pointerdown', zoomAt);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', fitCanvasToFrame);
  }

  worker.onmessage = function handleWorkerMessage(event) {
    const message = event.data || {};

    if (message.type === 'frame') {
      if (message.jobId !== jobId) {
        return;
      }
      latestMetrics = message.metrics;
      drawFrame(message.width, message.height, message.pixels);
      labels.statusValue.textContent = 'Complete';
      updateMetrics();
    } else if (message.type === 'benchmark') {
      labels.benchmarkValue.textContent = `P95 ${message.p95Ms.toFixed(1)} ms`;
      labels.statusValue.textContent = 'Benchmark complete';
    }
  };

  worker.onerror = function handleWorkerError() {
    labels.statusValue.textContent = 'Worker error';
  };

  const sharedConfig = core.parseShareHash(window.location.hash);
  if (sharedConfig) {
    currentConfig = sharedConfig;
  }

  applyConfigToControls(currentConfig);
  bindControls();
  requestRender('Rendering');
}());
