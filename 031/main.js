(function () {
  'use strict';

  const canvas = document.getElementById('clipCanvas');
  const context = canvas.getContext('2d');
  const windowSelect = document.getElementById('windowSelect');
  const scaleRange = document.getElementById('scaleRange');
  const pointRange = document.getElementById('pointRange');
  const scaleValue = document.getElementById('scaleValue');
  const pointValue = document.getElementById('pointValue');
  const windowBadge = document.getElementById('windowBadge');
  const scaleBadge = document.getElementById('scaleBadge');
  const statusBadge = document.getElementById('statusBadge');
  const inputValue = document.getElementById('inputValue');
  const clipValue = document.getElementById('clipValue');
  const outputValue = document.getElementById('outputValue');
  const areaInValue = document.getElementById('areaInValue');
  const areaOutValue = document.getElementById('areaOutValue');
  const ratioValue = document.getElementById('ratioValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function project(point) {
    const scale = Math.min(canvas.width, canvas.height) * 0.38;
    return {
      x: canvas.width * 0.5 + point.x * scale,
      y: canvas.height * 0.5 + point.y * scale,
    };
  }

  function drawPolygon(points, fill, stroke, width) {
    if (points.length === 0) return;
    context.beginPath();
    const first = project(points[0]);
    context.moveTo(first.x, first.y);
    points.slice(1).forEach((point) => {
      const p = project(point);
      context.lineTo(p.x, p.y);
    });
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = width;
    context.stroke();
  }

  function draw(result) {
    context.fillStyle = '#07070c';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawPolygon(result.subject, 'rgba(91, 141, 239, 0.20)', 'rgba(91, 141, 239, 0.78)', 2);
    drawPolygon(result.clipWindow, 'rgba(247, 223, 30, 0.08)', 'rgba(247, 223, 30, 0.92)', 3);
    drawPolygon(result.clipped, 'rgba(113, 231, 169, 0.46)', '#71e7a9', 4);
  }

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function update() {
    const scale = Number(scaleRange.value) / 100;
    const points = Number(pointRange.value);
    latest = window.ClipCore.analyze({ window: windowSelect.value, scale, points });
    draw(latest);

    scaleValue.textContent = scale.toFixed(2);
    pointValue.textContent = String(points);
    windowBadge.textContent = titleCase(windowSelect.value);
    scaleBadge.textContent = `Scale ${scale.toFixed(2)}`;
    statusBadge.textContent = 'Clipped';
    inputValue.textContent = String(latest.metrics.subjectVertices);
    clipValue.textContent = String(latest.metrics.clipVertices);
    outputValue.textContent = String(latest.metrics.clippedVertices);
    areaInValue.textContent = latest.metrics.originalArea.toFixed(2);
    areaOutValue.textContent = latest.metrics.clippedArea.toFixed(2);
    ratioValue.textContent = `${Math.round(latest.metrics.retainedRatio * 100)}%`;
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.ClipCore.benchmark({
      window: windowSelect.value,
      scale: Number(scaleRange.value) / 100,
      points: Number(pointRange.value),
      runs: 60,
    });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('polygon-clipping.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, clipped: latest.clipped }, null, 2);
    download('polygon-clipping.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    const report = `Polygon Clipping Studio: ${latest.metrics.subjectVertices} input vertices clipped to ${latest.metrics.clippedVertices}, retaining ${(latest.metrics.retainedRatio * 100).toFixed(1)}% area.`;
    await navigator.clipboard.writeText(report);
    statusBadge.textContent = 'Report copied';
  });

  [windowSelect, scaleRange, pointRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
