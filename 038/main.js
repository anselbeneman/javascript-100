(function () {
  'use strict';

  const canvas = document.getElementById('scheduleCanvas');
  const context = canvas.getContext('2d');
  const nodeRange = document.getElementById('nodeRange');
  const densityRange = document.getElementById('densityRange');
  const seedRange = document.getElementById('seedRange');
  const nodeText = document.getElementById('nodeText');
  const densityText = document.getElementById('densityText');
  const seedText = document.getElementById('seedText');
  const nodeBadge = document.getElementById('nodeBadge');
  const durationBadge = document.getElementById('durationBadge');
  const statusBadge = document.getElementById('statusBadge');
  const nodeValue = document.getElementById('nodeValue');
  const edgeValue = document.getElementById('edgeValue');
  const criticalValue = document.getElementById('criticalValue');
  const pathValue = document.getElementById('pathValue');
  const validValue = document.getElementById('validValue');
  const cycleValue = document.getElementById('cycleValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function layout(result) {
    const order = new Map(result.order.map((id, index) => [id, index]));
    return new Map(result.nodes.map((node) => {
      const index = order.get(node.id);
      const x = 70 + index / Math.max(1, result.nodes.length - 1) * (canvas.width - 140);
      const y = 120 + (node.duration % 5) * 90;
      return [node.id, { x, y }];
    }));
  }

  function draw(result) {
    const positions = layout(result);
    const critical = new Set(result.criticalPath);
    context.fillStyle = '#070b10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    result.edges.forEach((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      const onCritical = critical.has(edge.from) && critical.has(edge.to);
      context.strokeStyle = onCritical ? 'rgba(247,223,30,.72)' : 'rgba(119,150,178,.28)';
      context.lineWidth = onCritical ? 3 : 1.5;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.bezierCurveTo(from.x + 45, from.y - 38, to.x - 45, to.y - 38, to.x, to.y);
      context.stroke();
    });
    result.nodes.forEach((node) => {
      const position = positions.get(node.id);
      context.fillStyle = critical.has(node.id) ? '#f7df1e' : '#52d6ff';
      context.strokeStyle = 'rgba(255,255,255,.35)';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(position.x - 28, position.y - 20, 56, 40, 8);
      context.fill();
      context.stroke();
      context.fillStyle = '#071017';
      context.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(node.id, position.x, position.y - 5);
      context.fillText(`${node.duration}d`, position.x, position.y + 10);
    });
  }

  function update() {
    const count = Number(nodeRange.value);
    const density = Number(densityRange.value) / 100;
    const seed = Number(seedRange.value);
    latest = window.SchedulerCore.analyze({ count, density, seed });
    draw(latest);

    nodeText.textContent = String(count);
    densityText.textContent = density.toFixed(2);
    seedText.textContent = String(seed);
    nodeBadge.textContent = `${count} tasks`;
    durationBadge.textContent = `${latest.metrics.criticalDuration} days`;
    statusBadge.textContent = latest.metrics.validOrder ? 'Scheduled' : 'Invalid';
    nodeValue.textContent = String(latest.metrics.nodes);
    edgeValue.textContent = String(latest.metrics.edges);
    criticalValue.textContent = String(latest.metrics.criticalDuration);
    pathValue.textContent = String(latest.metrics.criticalNodes);
    validValue.textContent = latest.metrics.validOrder ? 'Yes' : 'No';
    cycleValue.textContent = latest.metrics.hasCycle ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.SchedulerCore.benchmark({ count: Number(nodeRange.value), density: Number(densityRange.value) / 100, runs: 30 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgEdges.toFixed(0)} edges avg`;
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('topological-scheduler.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, order: latest.order, criticalPath: latest.criticalPath }, null, 2);
    download('topological-scheduler.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Topological Scheduler: ${latest.metrics.nodes} tasks, ${latest.metrics.edges} dependencies, critical path ${latest.metrics.criticalDuration} days.`);
    statusBadge.textContent = 'Report copied';
  });

  [nodeRange, densityRange, seedRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
