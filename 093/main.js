(function () {
  'use strict';

  const projectName = 'FFT Convolution Studio';
  const downloadSlug = 'fft-convolution-studio';
  const metricLabel = 'Error';
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
    context.strokeStyle = 'rgba(125,211,252,.08)';
    context.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    const points = result.points || [];
    const links = result.links || [];
    const pathSet = new Set(result.path || []);

    links.forEach((link) => {
      const a = points[link[0]];
      const b = points[link[1]];
      if (!a || !b) return;
      const strength = Math.max(0.12, Math.min(1, Number(link[2]) || 0.24));
      context.strokeStyle = 'rgba(125,211,252,' + (0.12 + strength * 0.58).toFixed(3) + ')';
      context.lineWidth = 1 + strength * 3.5;
      context.beginPath();
      context.moveTo(a.x * canvas.width, a.y * canvas.height);
      context.lineTo(b.x * canvas.width, b.y * canvas.height);
      context.stroke();
    });

    points.forEach((point, index) => {
      const active = pathSet.has(index);
      context.fillStyle = active ? '#f7df1e' : (point.outlier ? 'rgba(248,113,113,.74)' : 'rgba(125,211,252,.72)');
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, point.r || 4, 0, Math.PI * 2);
      context.fill();
    });

    const series = result.series || [];
    if (series.length > 0) {
      const max = Math.max(...series.map((value) => Math.abs(value)), 1);
      const barWidth = canvas.width / series.length;
      series.forEach((value, index) => {
        const height = Math.abs(value) / max * canvas.height * 0.32;
        context.fillStyle = value >= 0 ? 'rgba(247,223,30,.64)' : 'rgba(248,113,113,.64)';
        context.fillRect(index * barWidth, canvas.height - height - 22, Math.max(1, barWidth - 2), height);
      });
    }
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(3);
  }

  function update() {
    latest = window.ProjectCore.analyze({ seed: Number(seedRange.value), size: Number(sizeRange.value) });
    draw(latest);
    seedText.textContent = seedRange.value;
    sizeText.textContent = sizeRange.value;
    scoreBadge.textContent = metricLabel + ' ' + formatNumber(latest.metrics.score);
    statusBadge.textContent = latest.metrics.verified ? 'Verified' : 'Check';
    itemValue.textContent = String(latest.metrics.items);
    scoreValue.textContent = formatNumber(latest.metrics.score);
    extraValue.textContent = formatNumber(latest.metrics.extra);
    verifiedValue.textContent = latest.metrics.verified ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.ProjectCore.benchmark({ seed: Number(seedRange.value), size: Number(sizeRange.value), runs: 12 });
    benchmarkValue.textContent = result.avgMs.toFixed(3) + ' ms';
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => download(downloadSlug + '.png', canvas.toDataURL('image/png')));

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), project: projectName, metrics: latest.metrics }, null, 2);
    download(downloadSlug + '.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(projectName + ': ' + JSON.stringify(latest.metrics));
    statusBadge.textContent = 'Report copied';
  });

  [seedRange, sizeRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
