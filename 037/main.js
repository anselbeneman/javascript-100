(function () {
  'use strict';

  const canvas = document.getElementById('triCanvas');
  const context = canvas.getContext('2d');
  const vertexRange = document.getElementById('vertexRange');
  const notchRange = document.getElementById('notchRange');
  const phaseRange = document.getElementById('phaseRange');
  const vertexText = document.getElementById('vertexText');
  const notchText = document.getElementById('notchText');
  const phaseText = document.getElementById('phaseText');
  const vertexBadge = document.getElementById('vertexBadge');
  const triangleBadge = document.getElementById('triangleBadge');
  const statusBadge = document.getElementById('statusBadge');
  const vertexValue = document.getElementById('vertexValue');
  const triangleValue = document.getElementById('triangleValue');
  const expectedValue = document.getElementById('expectedValue');
  const areaValue = document.getElementById('areaValue');
  const errorValue = document.getElementById('errorValue');
  const guardValue = document.getElementById('guardValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function project(point) {
    const scale = Math.min(canvas.width, canvas.height) * 0.39;
    return { x: canvas.width * 0.5 + point.x * scale, y: canvas.height * 0.5 + point.y * scale };
  }

  function draw(result) {
    context.fillStyle = '#080a0d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    result.triangles.forEach((triangle, index) => {
      const hue = (index * 43) % 360;
      context.beginPath();
      triangle.forEach((point, pointIndex) => {
        const p = project(point);
        if (pointIndex === 0) context.moveTo(p.x, p.y);
        else context.lineTo(p.x, p.y);
      });
      context.closePath();
      context.fillStyle = `hsla(${hue}, 72%, 58%, .22)`;
      context.strokeStyle = `hsla(${hue}, 80%, 70%, .72)`;
      context.lineWidth = 2;
      context.fill();
      context.stroke();
    });
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 4;
    context.beginPath();
    result.polygon.forEach((point, index) => {
      const p = project(point);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.closePath();
    context.stroke();
  }

  function update() {
    const count = Number(vertexRange.value);
    const notch = Number(notchRange.value) / 100;
    const phase = Number(phaseRange.value) / 100;
    latest = window.TriangulateCore.analyze({ count, notch, phase });
    draw(latest);

    vertexText.textContent = String(count);
    notchText.textContent = notch.toFixed(2);
    phaseText.textContent = phase.toFixed(2);
    vertexBadge.textContent = `${count} vertices`;
    triangleBadge.textContent = `${latest.metrics.triangles} triangles`;
    statusBadge.textContent = 'Triangulated';
    vertexValue.textContent = String(latest.metrics.vertices);
    triangleValue.textContent = String(latest.metrics.triangles);
    expectedValue.textContent = String(latest.metrics.expectedTriangles);
    areaValue.textContent = latest.metrics.polygonArea.toFixed(3);
    errorValue.textContent = latest.metrics.areaError.toExponential(1);
    guardValue.textContent = String(latest.metrics.guards);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.TriangulateCore.benchmark({ count: Number(vertexRange.value), notch: Number(notchRange.value) / 100, runs: 30 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('ear-clipping-triangulator.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, polygon: latest.polygon }, null, 2);
    download('ear-clipping-triangulator.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Ear Clipping Triangulator: ${latest.metrics.vertices} vertices into ${latest.metrics.triangles} triangles, area error ${latest.metrics.areaError.toExponential(2)}.`);
    statusBadge.textContent = 'Report copied';
  });

  [vertexRange, notchRange, phaseRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
