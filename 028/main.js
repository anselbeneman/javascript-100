(function () {
  'use strict';

  const canvas = document.getElementById('lsystemCanvas');
  const context = canvas.getContext('2d');
  const presetSelect = document.getElementById('presetSelect');
  const iterationRange = document.getElementById('iterationRange');
  const angleRange = document.getElementById('angleRange');
  const iterationValue = document.getElementById('iterationValue');
  const angleValue = document.getElementById('angleValue');
  const presetBadge = document.getElementById('presetBadge');
  const growthBadge = document.getElementById('growthBadge');
  const statusBadge = document.getElementById('statusBadge');
  const segmentValue = document.getElementById('segmentValue');
  const symbolValue = document.getElementById('symbolValue');
  const branchValue = document.getElementById('branchValue');
  const depthValue = document.getElementById('depthValue');
  const boundsValue = document.getElementById('boundsValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function draw(result) {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#06100d';
    context.fillRect(0, 0, width, height);

    const bounds = result.bounds;
    const scale = Math.min(
      (width * 0.82) / Math.max(1, bounds.width),
      (height * 0.82) / Math.max(1, bounds.height),
    );
    const offsetX = width * 0.5 - (bounds.minX + bounds.width * 0.5) * scale;
    const offsetY = height * 0.9 - bounds.maxY * scale;

    context.lineCap = 'round';
    result.segments.forEach((segment) => {
      const intensity = Math.min(1, 0.25 + segment.depth * 0.13);
      context.strokeStyle = `rgba(${Math.round(102 + intensity * 70)}, ${Math.round(224 - intensity * 20)}, ${Math.round(170 + intensity * 40)}, 0.92)`;
      context.lineWidth = Math.max(1, 3.8 - segment.depth * 0.34);
      context.beginPath();
      context.moveTo(segment.x1 * scale + offsetX, segment.y1 * scale + offsetY);
      context.lineTo(segment.x2 * scale + offsetX, segment.y2 * scale + offsetY);
      context.stroke();
    });
  }

  function update() {
    const preset = presetSelect.value;
    const iterations = Number(iterationRange.value);
    const angle = Number(angleRange.value);
    latest = window.LSystemCore.analyze({ preset, iterations, angle });
    draw(latest);

    iterationValue.textContent = String(iterations);
    angleValue.textContent = String(angle);
    presetBadge.textContent = titleCase(preset);
    growthBadge.textContent = `${iterations} iterations`;
    statusBadge.textContent = 'Rendered';
    segmentValue.textContent = latest.metrics.segments.toLocaleString();
    symbolValue.textContent = latest.metrics.symbols.toLocaleString();
    branchValue.textContent = latest.metrics.branches.toLocaleString();
    depthValue.textContent = String(latest.metrics.maxDepth);
    boundsValue.textContent = `${latest.metrics.width.toFixed(0)} x ${latest.metrics.height.toFixed(0)}`;
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.LSystemCore.benchmark({
      preset: presetSelect.value,
      iterations: Number(iterationRange.value),
      angle: Number(angleRange.value),
      runs: 30,
    });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('l-system-garden.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, history: latest.history }, null, 2);
    download('l-system-garden.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    const report = `L-System Garden: ${latest.metrics.segments} drawn segments from ${latest.metrics.symbols} grammar symbols, branch depth ${latest.metrics.maxDepth}.`;
    await navigator.clipboard.writeText(report);
    statusBadge.textContent = 'Report copied';
  });

  [presetSelect, iterationRange, angleRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
