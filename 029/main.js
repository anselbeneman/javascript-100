(function () {
  'use strict';

  const canvas = document.getElementById('pathCanvas');
  const context = canvas.getContext('2d');
  const heuristicSelect = document.getElementById('heuristicSelect');
  const densityRange = document.getElementById('densityRange');
  const seedRange = document.getElementById('seedRange');
  const densityValue = document.getElementById('densityValue');
  const seedValue = document.getElementById('seedValue');
  const heuristicBadge = document.getElementById('heuristicBadge');
  const densityBadge = document.getElementById('densityBadge');
  const statusBadge = document.getElementById('statusBadge');
  const pathValue = document.getElementById('pathValue');
  const visitedValue = document.getElementById('visitedValue');
  const costValue = document.getElementById('costValue');
  const turnValue = document.getElementById('turnValue');
  const pushValue = document.getElementById('pushValue');
  const solvedValue = document.getElementById('solvedValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function drawCell(cell, cellW, cellH, color) {
    context.fillStyle = color;
    context.fillRect(cell.x * cellW + 1, cell.y * cellH + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
  }

  function draw(result) {
    const { width, height } = canvas;
    const cellW = width / result.width;
    const cellH = height / result.height;
    context.fillStyle = '#061019';
    context.fillRect(0, 0, width, height);

    for (let y = 0; y < result.height; y += 1) {
      for (let x = 0; x < result.width; x += 1) {
        context.fillStyle = result.grid[y][x] ? '#18242f' : '#08131c';
        context.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }

    result.visited.forEach((cell) => drawCell(cell, cellW, cellH, 'rgba(93, 213, 255, 0.22)'));
    result.path.forEach((cell, index) => {
      const alpha = 0.35 + index / Math.max(1, result.path.length) * 0.55;
      drawCell(cell, cellW, cellH, `rgba(247, 223, 30, ${alpha})`);
    });
    drawCell(result.start, cellW, cellH, '#60d394');
    drawCell(result.goal, cellW, cellH, '#ff6b6b');
  }

  function update() {
    const density = Number(densityRange.value) / 100;
    const seed = Number(seedRange.value);
    latest = window.PathCore.analyze({
      density,
      seed,
      heuristic: heuristicSelect.value,
    });
    draw(latest);

    densityValue.textContent = `${Math.round(density * 100)}%`;
    seedValue.textContent = String(seed);
    heuristicBadge.textContent = heuristicSelect.options[heuristicSelect.selectedIndex].text;
    densityBadge.textContent = `${Math.round(density * 100)}% walls`;
    statusBadge.textContent = latest.metrics.solved ? 'Solved' : 'Blocked';
    pathValue.textContent = latest.metrics.pathLength.toLocaleString();
    visitedValue.textContent = latest.metrics.visited.toLocaleString();
    costValue.textContent = Number.isFinite(latest.metrics.cost) ? latest.metrics.cost.toFixed(1) : 'Inf';
    turnValue.textContent = String(latest.metrics.turns);
    pushValue.textContent = latest.metrics.frontierPushes.toLocaleString();
    solvedValue.textContent = latest.metrics.solved ? 'Solved' : 'No route';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.PathCore.benchmark({
      density: Number(densityRange.value) / 100,
      heuristic: heuristicSelect.value,
      runs: 24,
    });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = `${result.solved}/${result.runs} solved`;
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('a-star-pathfinding.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, path: latest.path }, null, 2);
    download('a-star-pathfinding.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    const report = `A-Star Pathfinding Lab: route length ${latest.metrics.pathLength}, ${latest.metrics.visited} cells visited, cost ${latest.metrics.cost.toFixed(2)}.`;
    await navigator.clipboard.writeText(report);
    statusBadge.textContent = 'Report copied';
  });

  [heuristicSelect, densityRange, seedRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
