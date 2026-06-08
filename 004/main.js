(function startPathfindingLab() {
  'use strict';

  const core = window.PathfindingCore;
  const canvasFrame = document.getElementById('canvasFrame');
  const canvas = document.getElementById('pathCanvas');
  const context = canvas.getContext('2d');

  const controls = {
    presetSelect: document.getElementById('presetSelect'),
    algorithmSelect: document.getElementById('algorithmSelect'),
    drawModeSelect: document.getElementById('drawModeSelect'),
    playButton: document.getElementById('playButton'),
    stepButton: document.getElementById('stepButton'),
    regenerateButton: document.getElementById('regenerateButton'),
    columnsRange: document.getElementById('columnsRange'),
    rowsRange: document.getElementById('rowsRange'),
    densityRange: document.getElementById('densityRange'),
    weightRange: document.getElementById('weightRange'),
    speedRange: document.getElementById('speedRange'),
    heuristicRange: document.getElementById('heuristicRange'),
    diagonalToggle: document.getElementById('diagonalToggle'),
    weightsToggle: document.getElementById('weightsToggle'),
    pngButton: document.getElementById('pngButton'),
    jsonButton: document.getElementById('jsonButton'),
    reportButton: document.getElementById('reportButton'),
  };

  const labels = {
    algorithmBadge: document.getElementById('algorithmBadge'),
    presetBadge: document.getElementById('presetBadge'),
    seedBadge: document.getElementById('seedBadge'),
    visitedValue: document.getElementById('visitedValue'),
    frontierValue: document.getElementById('frontierValue'),
    pathValue: document.getElementById('pathValue'),
    costValue: document.getElementById('costValue'),
    turnsValue: document.getElementById('turnsValue'),
    timeValue: document.getElementById('timeValue'),
    densityMetric: document.getElementById('densityMetric'),
    statusValue: document.getElementById('statusValue'),
    columnsValue: document.getElementById('columnsValue'),
    rowsValue: document.getElementById('rowsValue'),
    densityValue: document.getElementById('densityValue'),
    weightValue: document.getElementById('weightValue'),
    speedValue: document.getElementById('speedValue'),
    heuristicValue: document.getElementById('heuristicValue'),
  };

  let seed = createSeed();
  let grid = null;
  let solution = null;
  let animation = {
    running: false,
    visitedCursor: 0,
    pathCursor: 0,
    lastFrame: performance.now(),
  };
  let pointerDown = false;

  function createSeed() {
    return `path-${Math.floor(Date.now() % 100000)}-${Math.floor(Math.random() * 1000)}`;
  }

  function readConfig() {
    return core.normalizeConfig({
      preset: controls.presetSelect.value,
      algorithm: controls.algorithmSelect.value,
      columns: Number(controls.columnsRange.value),
      rows: Number(controls.rowsRange.value),
      density: Number(controls.densityRange.value),
      weight: Number(controls.weightRange.value),
      heuristic: Number(controls.heuristicRange.value),
      diagonal: controls.diagonalToggle.checked,
      showWeights: controls.weightsToggle.checked,
      seed,
    });
  }

  function updateControlLabels() {
    labels.columnsValue.textContent = controls.columnsRange.value;
    labels.rowsValue.textContent = controls.rowsRange.value;
    labels.densityValue.textContent = `${controls.densityRange.value}%`;
    labels.weightValue.textContent = `${controls.weightRange.value}%`;
    labels.speedValue.textContent = `${controls.speedRange.value}x`;
    labels.heuristicValue.textContent = Number(controls.heuristicRange.value).toFixed(2);
  }

  function applyPresetDefaults() {
    const preset = core.presets[controls.presetSelect.value] || core.presets.warehouse;
    controls.densityRange.value = String(preset.density);
    controls.weightRange.value = String(preset.weight);
    updateControlLabels();
  }

  function rebuildGrid(keepSeed) {
    if (!keepSeed) {
      seed = createSeed();
    }

    grid = core.createGrid(readConfig());
    solveGrid('Ready');
  }

  function solveGrid(statusText) {
    const config = readConfig();
    grid.config = config;
    solution = core.solve(grid, {
      algorithm: config.algorithm,
      diagonal: config.diagonal,
      heuristic: config.heuristic,
    });
    animation.running = false;
    animation.visitedCursor = Math.min(animation.visitedCursor, solution.order.length);
    animation.pathCursor = Math.min(animation.pathCursor, solution.path.length);
    controls.playButton.textContent = 'Run';
    labels.statusValue.textContent = statusText || (solution.found ? 'Solved' : 'No path');
    updateMetrics();
    draw();
  }

  function resetAnimation() {
    animation.running = false;
    animation.visitedCursor = 0;
    animation.pathCursor = 0;
    controls.playButton.textContent = 'Run';
    labels.statusValue.textContent = 'Ready';
    draw();
  }

  function stepAnimation(amount) {
    if (!solution) {
      return;
    }

    const stepCount = amount || Number(controls.speedRange.value);
    if (animation.visitedCursor < solution.order.length) {
      animation.visitedCursor = Math.min(solution.order.length, animation.visitedCursor + stepCount);
    } else if (animation.pathCursor < solution.path.length) {
      animation.pathCursor = Math.min(solution.path.length, animation.pathCursor + Math.max(1, Math.floor(stepCount / 4)));
    }

    if (animation.visitedCursor >= solution.order.length && animation.pathCursor >= solution.path.length) {
      animation.running = false;
      controls.playButton.textContent = 'Run';
      labels.statusValue.textContent = solution.found ? 'Complete' : 'No path';
    } else {
      labels.statusValue.textContent = 'Searching';
    }

    updateMetrics();
    draw();
  }

  function toggleRun() {
    animation.running = !animation.running;
    controls.playButton.textContent = animation.running ? 'Pause' : 'Run';
    labels.statusValue.textContent = animation.running ? 'Searching' : 'Paused';
  }

  function updateMetrics() {
    const visibleVisited = Math.min(animation.visitedCursor, solution ? solution.order.length : 0);
    const visiblePath = Math.min(animation.pathCursor, solution ? solution.path.length : 0);
    const metrics = solution ? solution.metrics : null;

    labels.visitedValue.textContent = formatCompact(visibleVisited || (metrics ? metrics.visited : 0));
    labels.frontierValue.textContent = formatCompact(metrics ? metrics.peakFrontier : 0);
    labels.pathValue.textContent = formatCompact(visiblePath || (metrics ? metrics.pathLength : 0));
    labels.costValue.textContent = metrics ? metrics.pathCost.toFixed(1) : '0';
    labels.turnsValue.textContent = String(metrics ? metrics.turns : 0);
    labels.timeValue.textContent = `${(metrics ? metrics.elapsedMs : 0).toFixed(2)} ms`;
    labels.densityMetric.textContent = `${Math.round((metrics ? metrics.density : 0) * 100)}%`;
    labels.algorithmBadge.textContent = grid ? grid.config.algorithmLabel : 'A Star';
    labels.presetBadge.textContent = grid ? grid.config.presetLabel : 'Warehouse';
    labels.seedBadge.textContent = `Seed ${core.hashString(seed).toString(16).slice(0, 6)}`;
  }

  function formatCompact(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return String(Math.round(value));
  }

  function resizeCanvas() {
    const bounds = canvasFrame.getBoundingClientRect();
    const width = Math.max(320, Math.round(bounds.width));
    const height = Math.max(260, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
  }

  function layout() {
    const bounds = canvas.getBoundingClientRect();
    const columns = grid ? grid.config.columns : 1;
    const rows = grid ? grid.config.rows : 1;
    const cell = Math.floor(Math.min(bounds.width / columns, bounds.height / rows));
    const width = cell * columns;
    const height = cell * rows;

    return {
      cell,
      offsetX: Math.floor((bounds.width - width) / 2),
      offsetY: Math.floor((bounds.height - height) / 2),
      width,
      height,
    };
  }

  function draw() {
    if (!grid || !solution) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const view = layout();
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.fillStyle = '#050809';
    context.fillRect(0, 0, bounds.width, bounds.height);
    drawCells(view);
    drawVisited(view);
    drawPath(view);
    drawGridLines(view);
    drawEndpoints(view);
  }

  function drawCells(view) {
    for (let y = 0; y < grid.config.rows; y += 1) {
      for (let x = 0; x < grid.config.columns; x += 1) {
        const index = core.indexOf(x, y, grid.config.columns);
        const px = view.offsetX + x * view.cell;
        const py = view.offsetY + y * view.cell;

        if (grid.walls[index]) {
          context.fillStyle = '#26313a';
        } else if (grid.config.showWeights && grid.weights[index] > 1) {
          const intensity = grid.weights[index] / 8;
          context.fillStyle = `rgba(255, 223, 61, ${0.10 + intensity * 0.18})`;
        } else {
          context.fillStyle = '#0c1114';
        }

        context.fillRect(px, py, view.cell, view.cell);
      }
    }
  }

  function drawVisited(view) {
    const limit = Math.min(animation.visitedCursor, solution.order.length);
    for (let index = 0; index < limit; index += 1) {
      const point = core.pointFromIndex(solution.order[index], grid.config.columns);
      const alpha = 0.18 + (index / Math.max(1, limit)) * 0.36;
      context.fillStyle = `rgba(72, 184, 203, ${alpha.toFixed(3)})`;
      context.fillRect(view.offsetX + point.x * view.cell, view.offsetY + point.y * view.cell, view.cell, view.cell);
    }
  }

  function drawPath(view) {
    const limit = Math.min(animation.pathCursor, solution.path.length);
    if (limit <= 0) {
      return;
    }

    context.fillStyle = 'rgba(255, 223, 61, 0.88)';
    for (let index = 0; index < limit; index += 1) {
      const point = core.pointFromIndex(solution.path[index], grid.config.columns);
      const inset = Math.max(1, Math.floor(view.cell * 0.18));
      context.fillRect(
        view.offsetX + point.x * view.cell + inset,
        view.offsetY + point.y * view.cell + inset,
        Math.max(1, view.cell - inset * 2),
        Math.max(1, view.cell - inset * 2),
      );
    }
  }

  function drawGridLines(view) {
    if (view.cell < 8) {
      return;
    }

    context.strokeStyle = 'rgba(238, 247, 245, 0.045)';
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= grid.config.columns; x += 1) {
      const px = view.offsetX + x * view.cell + 0.5;
      context.moveTo(px, view.offsetY);
      context.lineTo(px, view.offsetY + view.height);
    }
    for (let y = 0; y <= grid.config.rows; y += 1) {
      const py = view.offsetY + y * view.cell + 0.5;
      context.moveTo(view.offsetX, py);
      context.lineTo(view.offsetX + view.width, py);
    }
    context.stroke();
  }

  function drawEndpoints(view) {
    drawEndpoint(grid.start, view, '#6fe8d1', 'S');
    drawEndpoint(grid.goal, view, '#ff7668', 'G');
  }

  function drawEndpoint(point, view, color, label) {
    const x = view.offsetX + point.x * view.cell;
    const y = view.offsetY + point.y * view.cell;
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, Math.max(1, view.cell - 2), Math.max(1, view.cell - 2));

    if (view.cell >= 14) {
      context.fillStyle = '#061013';
      context.font = `700 ${Math.max(9, Math.floor(view.cell * 0.52))}px ui-sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, x + view.cell / 2, y + view.cell / 2);
    }
  }

  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const view = layout();
    const x = Math.floor((event.clientX - rect.left - view.offsetX) / view.cell);
    const y = Math.floor((event.clientY - rect.top - view.offsetY) / view.cell);
    return { x, y };
  }

  function paintFromEvent(event) {
    const point = cellFromEvent(event);
    core.setCell(grid, point.x, point.y, controls.drawModeSelect.value);
    solveGrid('Edited');
    resetAnimation();
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
      link.download = 'pathfinding-lab-004.png';
      link.click();
      URL.revokeObjectURL(url);
      labels.statusValue.textContent = 'PNG exported';
    }, 'image/png');
  }

  function exportJson() {
    const payload = JSON.stringify(core.createExportPayload(grid, solution), null, 2);
    copyText(payload, 'pathfinding-lab-004.json', 'JSON copied').catch(() => {
      labels.statusValue.textContent = 'JSON failed';
    });
  }

  function copyReport() {
    copyText(core.buildTechnicalReport(grid, solution), 'pathfinding-lab-004-report.md', 'Report copied').catch(() => {
      labels.statusValue.textContent = 'Report failed';
    });
  }

  function bindControls() {
    controls.presetSelect.addEventListener('change', () => {
      applyPresetDefaults();
      rebuildGrid(false);
    });
    controls.algorithmSelect.addEventListener('change', () => {
      solveGrid('Algorithm changed');
      resetAnimation();
    });
    controls.regenerateButton.addEventListener('click', () => rebuildGrid(false));
    controls.playButton.addEventListener('click', toggleRun);
    controls.stepButton.addEventListener('click', () => {
      animation.running = false;
      controls.playButton.textContent = 'Run';
      stepAnimation(Math.max(1, Number(controls.speedRange.value)));
    });

    [controls.columnsRange, controls.rowsRange, controls.densityRange, controls.weightRange].forEach((control) => {
      control.addEventListener('input', updateControlLabels);
      control.addEventListener('change', () => rebuildGrid(true));
    });

    [controls.speedRange, controls.heuristicRange].forEach((control) => {
      control.addEventListener('input', updateControlLabels);
      control.addEventListener('change', () => {
        solveGrid('Solver changed');
        resetAnimation();
      });
    });

    [controls.diagonalToggle, controls.weightsToggle].forEach((control) => {
      control.addEventListener('change', () => {
        solveGrid('Solver changed');
        resetAnimation();
      });
    });

    canvas.addEventListener('pointerdown', (event) => {
      pointerDown = true;
      canvas.setPointerCapture(event.pointerId);
      paintFromEvent(event);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (pointerDown) {
        paintFromEvent(event);
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      pointerDown = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerleave', () => {
      pointerDown = false;
    });

    controls.pngButton.addEventListener('click', exportPng);
    controls.jsonButton.addEventListener('click', exportJson);
    controls.reportButton.addEventListener('click', copyReport);
    window.addEventListener('resize', resizeCanvas);
  }

  function tick(now) {
    resizeCanvas();
    if (animation.running && now - animation.lastFrame > 16) {
      animation.lastFrame = now;
      stepAnimation(Math.max(1, Number(controls.speedRange.value)));
    }
    window.requestAnimationFrame(tick);
  }

  updateControlLabels();
  bindControls();
  rebuildGrid(true);
  resetAnimation();
  resizeCanvas();
  window.requestAnimationFrame(tick);
}());
