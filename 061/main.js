(function () {
  'use strict';

  const canvas = document.getElementById('projectCanvas');
  const context = canvas.getContext('2d');
  const seedRange = document.getElementById('seedRange');
  const sizeRange = document.getElementById('sizeRange');
  const seedText = document.getElementById('seedText');
  const sizeText = document.getElementById('sizeText');
  const scoreBadge = document.getElementById('scoreBadge');
  const statusBadge = document.getElementById('statusBadge');
  const itemValue = document.getElementById('itemValue');
  const scoreValue = document.getElementById('scoreValue');
  const extraValue = document.getElementById('extraValue');
  const verifiedValue = document.getElementById('verifiedValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function draw(result) {
    context.fillStyle = '#070b10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const points = result.points || [];
    const links = result.links || [];
    const path = result.path || [];
    links.forEach((link) => {
      const a = points[link[0]];
      const b = points[link[1]];
      if (!a || !b) return;
      context.strokeStyle = 'rgba(125,211,252,.24)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(a.x * canvas.width, a.y * canvas.height);
      context.lineTo(b.x * canvas.width, b.y * canvas.height);
      context.stroke();
    });
    if (path.length > 1) {
      context.strokeStyle = '#f7df1e';
      context.lineWidth = 4;
      context.beginPath();
      path.forEach((index, cursor) => {
        const p = points[index];
        if (!p) return;
        if (cursor === 0) context.moveTo(p.x * canvas.width, p.y * canvas.height);
        else context.lineTo(p.x * canvas.width, p.y * canvas.height);
      });
      context.stroke();
    }
    points.forEach((point, index) => {
      context.fillStyle = path.includes(index) ? '#f7df1e' : 'rgba(125,211,252,.72)';
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, point.r || 5, 0, Math.PI * 2);
      context.fill();
    });
    const series = result.series || [];
    if (series.length > 0) {
      const max = Math.max(...series.map((value) => Math.abs(value)), 1);
      const barWidth = canvas.width / series.length;
      series.forEach((value, index) => {
        const height = Math.abs(value) / max * canvas.height * 0.42;
        context.fillStyle = value >= 0 ? 'rgba(247,223,30,.62)' : 'rgba(248,113,113,.62)';
        context.fillRect(index * barWidth, canvas.height - height - 26, Math.max(1, barWidth - 2), height);
      });
    }
  }

  function update() {
    latest = window.ProjectCore.analyze({
      seed: Number(seedRange.value),
      size: Number(sizeRange.value),
    });
    draw(latest);
    seedText.textContent = seedRange.value;
    sizeText.textContent = sizeRange.value;
    scoreBadge.textContent = 'Score ' + latest.metrics.score.toFixed(3);
    statusBadge.textContent = latest.metrics.verified ? 'Verified' : 'Check';
    itemValue.textContent = String(latest.metrics.items);
    scoreValue.textContent = latest.metrics.score.toFixed(3);
    extraValue.textContent = String(latest.metrics.extra);
    verifiedValue.textContent = latest.metrics.verified ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.ProjectCore.benchmark({
      seed: Number(seedRange.value),
      size: Number(sizeRange.value),
      runs: 12,
    });
    benchmarkValue.textContent = result.avgMs.toFixed(3) + ' ms';
    statusBadge.textContent = 'Benchmarked';
  });
  document.getElementById('pngButton').addEventListener('click', () => download('quickselect-median.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics }, null, 2);
    download('quickselect-median.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText('Markov Text Chain Lab: ' + JSON.stringify(latest.metrics));
    statusBadge.textContent = 'Report copied';
  });
  [seedRange, sizeRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
