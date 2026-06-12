(function () {
  'use strict';

  const canvas = document.getElementById('quadCanvas');
  const context = canvas.getContext('2d');
  const countRange = document.getElementById('countRange');
  const capacityRange = document.getElementById('capacityRange');
  const seedRange = document.getElementById('seedRange');
  const countText = document.getElementById('countText');
  const capacityText = document.getElementById('capacityText');
  const seedText = document.getElementById('seedText');
  const pointBadge = document.getElementById('pointBadge');
  const hitBadge = document.getElementById('hitBadge');
  const statusBadge = document.getElementById('statusBadge');
  const pointValue = document.getElementById('pointValue');
  const hitValue = document.getElementById('hitValue');
  const nodeValue = document.getElementById('nodeValue');
  const depthValue = document.getElementById('depthValue');
  const visitedValue = document.getElementById('visitedValue');
  const verifiedValue = document.getElementById('verifiedValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function scaleRect(rect) {
    return { x: rect.x * canvas.width, y: rect.y * canvas.height, w: rect.w * canvas.width, h: rect.h * canvas.height };
  }

  function drawNode(node) {
    const rect = scaleRect(node.boundary);
    context.strokeStyle = `rgba(125, 211, 252, ${Math.max(0.1, 0.36 - node.depth * 0.04)})`;
    context.lineWidth = 1;
    context.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (node.children) node.children.forEach(drawNode);
  }

  function draw(result) {
    context.fillStyle = '#070b11';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawNode(result.root);
    const hitSet = new Set(result.hits.map((point) => point.id));
    result.points.forEach((point) => {
      context.fillStyle = hitSet.has(point.id) ? '#f7df1e' : 'rgba(125, 211, 252, .45)';
      context.fillRect(point.x * canvas.width - 2, point.y * canvas.height - 2, 4, 4);
    });
    const range = scaleRect(result.range);
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 3;
    context.strokeRect(range.x, range.y, range.w, range.h);
  }

  function update() {
    const count = Number(countRange.value);
    const capacity = Number(capacityRange.value);
    const seed = Number(seedRange.value);
    latest = window.QuadtreeCore.analyze({ count, capacity, seed });
    draw(latest);
    countText.textContent = String(count);
    capacityText.textContent = String(capacity);
    seedText.textContent = String(seed);
    pointBadge.textContent = `${count} points`;
    hitBadge.textContent = `${latest.metrics.hits} hits`;
    statusBadge.textContent = latest.metrics.verified ? 'Verified' : 'Mismatch';
    pointValue.textContent = String(latest.metrics.points);
    hitValue.textContent = String(latest.metrics.hits);
    nodeValue.textContent = String(latest.metrics.nodes);
    depthValue.textContent = String(latest.metrics.depth);
    visitedValue.textContent = String(latest.metrics.visited);
    verifiedValue.textContent = latest.metrics.verified ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.QuadtreeCore.benchmark({ count: Number(countRange.value), capacity: Number(capacityRange.value), seed: Number(seedRange.value), runs: 20 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgVisited.toFixed(1)} visited avg`;
  });
  document.getElementById('pngButton').addEventListener('click', () => download('quadtree-range-query.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, range: latest.range }, null, 2);
    download('quadtree-range-query.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Quadtree Range Query: ${latest.metrics.points} points, ${latest.metrics.hits} hits, ${latest.metrics.visited} quadtree nodes visited, verified ${latest.metrics.verified}.`);
    statusBadge.textContent = 'Report copied';
  });
  [countRange, capacityRange, seedRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
