(function () {
  'use strict';

  const canvas = document.getElementById('marchingCanvas');
  const context = canvas.getContext('2d');
  const thresholdRange = document.getElementById('thresholdRange');
  const phaseRange = document.getElementById('phaseRange');
  const resolutionRange = document.getElementById('resolutionRange');
  const thresholdValue = document.getElementById('thresholdValue');
  const phaseValue = document.getElementById('phaseValue');
  const resolutionValue = document.getElementById('resolutionValue');
  const thresholdBadge = document.getElementById('thresholdBadge');
  const phaseBadge = document.getElementById('phaseBadge');
  const statusBadge = document.getElementById('statusBadge');
  const segmentValue = document.getElementById('segmentValue');
  const cellValue = document.getElementById('cellValue');
  const ambiguousValue = document.getElementById('ambiguousValue');
  const activeValue = document.getElementById('activeValue');
  const minValue = document.getElementById('minValue');
  const maxValue = document.getElementById('maxValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function colorFor(value, threshold) {
    const hot = value >= threshold;
    const amount = Math.max(0, Math.min(1, Math.abs(value - threshold) * 1.4));
    if (hot) return `rgba(${Math.round(38 + amount * 160)}, ${Math.round(128 + amount * 100)}, 160, 0.86)`;
    return `rgba(14, ${Math.round(24 + amount * 80)}, ${Math.round(42 + amount * 120)}, 0.86)`;
  }

  function draw(result) {
    const { width, height } = canvas;
    const cellW = width / (result.cols - 1);
    const cellH = height / (result.rows - 1);
    context.fillStyle = '#060a0f';
    context.fillRect(0, 0, width, height);

    for (let y = 0; y < result.rows - 1; y += 1) {
      for (let x = 0; x < result.cols - 1; x += 1) {
        context.fillStyle = colorFor(result.values[y][x], result.threshold);
        context.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }

    context.lineWidth = 2;
    context.strokeStyle = '#f7df1e';
    context.shadowColor = 'rgba(247, 223, 30, 0.45)';
    context.shadowBlur = 10;
    result.segments.forEach((segment) => {
      context.beginPath();
      context.moveTo(segment.x1 * cellW, segment.y1 * cellH);
      context.lineTo(segment.x2 * cellW, segment.y2 * cellH);
      context.stroke();
    });
    context.shadowBlur = 0;
  }

  function update() {
    const threshold = Number(thresholdRange.value) / 100;
    const phase = Number(phaseRange.value) / 100;
    const resolution = Number(resolutionRange.value);
    latest = window.MarchingCore.analyze({
      threshold,
      phase,
      cols: resolution,
      rows: Math.round(resolution * 0.64),
    });
    draw(latest);

    thresholdValue.textContent = threshold.toFixed(2);
    phaseValue.textContent = phase.toFixed(2);
    resolutionValue.textContent = String(resolution);
    thresholdBadge.textContent = `Threshold ${threshold.toFixed(2)}`;
    phaseBadge.textContent = `Phase ${phase.toFixed(2)}`;
    statusBadge.textContent = 'Contours ready';
    segmentValue.textContent = latest.metrics.segments.toLocaleString();
    cellValue.textContent = latest.metrics.cells.toLocaleString();
    ambiguousValue.textContent = latest.metrics.ambiguous.toLocaleString();
    activeValue.textContent = `${Math.round(latest.metrics.activeRatio * 100)}%`;
    minValue.textContent = latest.metrics.min.toFixed(2);
    maxValue.textContent = latest.metrics.max.toFixed(2);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.MarchingCore.benchmark({
      cols: Number(resolutionRange.value),
      rows: Math.round(Number(resolutionRange.value) * 0.64),
      threshold: Number(thresholdRange.value) / 100,
      runs: 30,
    });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('marching-squares.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, threshold: latest.threshold }, null, 2);
    download('marching-squares.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    const report = `Marching Squares Lab: ${latest.metrics.segments} contour segments across ${latest.metrics.cells} cells, ${latest.metrics.ambiguous} ambiguous cases.`;
    await navigator.clipboard.writeText(report);
    statusBadge.textContent = 'Report copied';
  });

  [thresholdRange, phaseRange, resolutionRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
