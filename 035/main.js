(function () {
  'use strict';

  const canvas = document.getElementById('kmeansCanvas');
  const context = canvas.getContext('2d');
  const kRange = document.getElementById('kRange');
  const iterationRange = document.getElementById('iterationRange');
  const sampleRange = document.getElementById('sampleRange');
  const kText = document.getElementById('kText');
  const iterationText = document.getElementById('iterationText');
  const sampleText = document.getElementById('sampleText');
  const clusterBadge = document.getElementById('clusterBadge');
  const inertiaBadge = document.getElementById('inertiaBadge');
  const statusBadge = document.getElementById('statusBadge');
  const sampleValue = document.getElementById('sampleValue');
  const kValue = document.getElementById('kValue');
  const iterationMetric = document.getElementById('iterationMetric');
  const inertiaValue = document.getElementById('inertiaValue');
  const improveValue = document.getElementById('improveValue');
  const emptyValue = document.getElementById('emptyValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function rgb(color) {
    return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
  }

  function draw(result) {
    context.fillStyle = '#070a0f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const plotW = canvas.width * 0.72;
    const plotH = canvas.height - 80;
    result.samples.forEach((sample, index) => {
      const x = 42 + sample.r / 255 * plotW;
      const y = 40 + sample.g / 255 * plotH;
      context.fillStyle = rgb(result.centroids[result.assignments[index]]);
      context.globalAlpha = 0.45;
      context.beginPath();
      context.arc(x, y, 4 + sample.b / 255 * 2, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
    result.centroids.forEach((centroid, index) => {
      const x = 42 + centroid.r / 255 * plotW;
      const y = 40 + centroid.g / 255 * plotH;
      context.fillStyle = rgb(centroid);
      context.strokeStyle = '#f7df1e';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, 14, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#f5f7fb';
      context.fillRect(canvas.width - 230, 48 + index * 44, 36, 28);
      context.fillStyle = rgb(centroid);
      context.fillRect(canvas.width - 228, 50 + index * 44, 32, 24);
      context.fillStyle = '#f5f7fb';
      context.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.fillText(`${index + 1}: ${result.counts[index]} px`, canvas.width - 184, 68 + index * 44);
    });
  }

  function update() {
    const k = Number(kRange.value);
    const iterations = Number(iterationRange.value);
    const count = Number(sampleRange.value);
    latest = window.KMeansCore.analyze({ k, iterations, count });
    draw(latest);

    kText.textContent = String(k);
    iterationText.textContent = String(iterations);
    sampleText.textContent = String(count);
    clusterBadge.textContent = `${k} clusters`;
    inertiaBadge.textContent = `Inertia ${Math.round(latest.metrics.inertia)}`;
    statusBadge.textContent = 'Clustered';
    sampleValue.textContent = latest.metrics.samples.toLocaleString();
    kValue.textContent = String(latest.metrics.k);
    iterationMetric.textContent = String(latest.metrics.iterations);
    inertiaValue.textContent = Math.round(latest.metrics.inertia).toLocaleString();
    improveValue.textContent = `${Math.round(latest.metrics.improvement * 100)}%`;
    emptyValue.textContent = String(latest.metrics.emptyClusters);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.KMeansCore.benchmark({ k: Number(kRange.value), iterations: Number(iterationRange.value), count: Number(sampleRange.value), runs: 18 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('kmeans-color-quantizer.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, centroids: latest.centroids }, null, 2);
    download('kmeans-color-quantizer.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`K-Means Color Quantizer: ${latest.metrics.samples} samples into ${latest.metrics.k} clusters with ${(latest.metrics.improvement * 100).toFixed(1)}% inertia improvement.`);
    statusBadge.textContent = 'Report copied';
  });

  [kRange, iterationRange, sampleRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
