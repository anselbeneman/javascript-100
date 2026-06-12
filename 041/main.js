(function () {
  'use strict';

  const canvas = document.getElementById('hullCanvas');
  const context = canvas.getContext('2d');
  const countRange = document.getElementById('countRange');
  const seedRange = document.getElementById('seedRange');
  const countText = document.getElementById('countText');
  const seedText = document.getElementById('seedText');
  const pointBadge = document.getElementById('pointBadge');
  const hullBadge = document.getElementById('hullBadge');
  const statusBadge = document.getElementById('statusBadge');
  const pointValue = document.getElementById('pointValue');
  const hullValue = document.getElementById('hullValue');
  const areaValue = document.getElementById('areaValue');
  const perimeterValue = document.getElementById('perimeterValue');
  const containsValue = document.getElementById('containsValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function project(point) {
    const scale = Math.min(canvas.width, canvas.height) * 0.42;
    return { x: canvas.width * 0.5 + point.x * scale, y: canvas.height * 0.5 + point.y * scale };
  }

  function draw(result) {
    context.fillStyle = '#070b11';
    context.fillRect(0, 0, canvas.width, canvas.height);
    result.points.forEach((point) => {
      const p = project(point);
      context.fillStyle = 'rgba(123, 211, 255, .42)';
      context.beginPath();
      context.arc(p.x, p.y, 3, 0, Math.PI * 2);
      context.fill();
    });
    context.fillStyle = 'rgba(247, 223, 30, .12)';
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 4;
    context.beginPath();
    result.hull.forEach((point, index) => {
      const p = project(point);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }

  function update() {
    const count = Number(countRange.value);
    const seed = Number(seedRange.value);
    latest = window.HullCore.analyze({ count, seed });
    draw(latest);
    countText.textContent = String(count);
    seedText.textContent = String(seed);
    pointBadge.textContent = `${count} points`;
    hullBadge.textContent = `Hull ${latest.metrics.hullPoints}`;
    statusBadge.textContent = 'Built';
    pointValue.textContent = String(latest.metrics.points);
    hullValue.textContent = String(latest.metrics.hullPoints);
    areaValue.textContent = latest.metrics.area.toFixed(2);
    perimeterValue.textContent = latest.metrics.perimeter.toFixed(2);
    containsValue.textContent = latest.metrics.containsAll ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.HullCore.benchmark({ count: Number(countRange.value), seed: Number(seedRange.value), runs: 24 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgHullPoints.toFixed(1)} hull avg`;
  });
  document.getElementById('pngButton').addEventListener('click', () => download('convex-hull.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, hull: latest.hull }, null, 2);
    download('convex-hull.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Convex Hull Workbench: ${latest.metrics.points} points, ${latest.metrics.hullPoints} hull vertices, area ${latest.metrics.area.toFixed(3)}.`);
    statusBadge.textContent = 'Report copied';
  });
  [countRange, seedRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
