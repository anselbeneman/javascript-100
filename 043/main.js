(function () {
  'use strict';

  const canvas = document.getElementById('logisticCanvas');
  const context = canvas.getContext('2d');
  const sampleRange = document.getElementById('sampleRange');
  const epochRange = document.getElementById('epochRange');
  const rateRange = document.getElementById('rateRange');
  const sampleText = document.getElementById('sampleText');
  const epochText = document.getElementById('epochText');
  const rateText = document.getElementById('rateText');
  const sampleBadge = document.getElementById('sampleBadge');
  const accuracyBadge = document.getElementById('accuracyBadge');
  const statusBadge = document.getElementById('statusBadge');
  const sampleValue = document.getElementById('sampleValue');
  const epochValue = document.getElementById('epochValue');
  const lossValue = document.getElementById('lossValue');
  const accuracyValue = document.getElementById('accuracyValue');
  const wxValue = document.getElementById('wxValue');
  const wyValue = document.getElementById('wyValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function project(sample) {
    return { x: canvas.width * (sample.x + 1.15) / 2.3, y: canvas.height * (1 - (sample.y + 1.15) / 2.3) };
  }

  function draw(result) {
    context.fillStyle = '#080b10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const grid = 34;
    for (let y = 0; y < canvas.height; y += grid) {
      for (let x = 0; x < canvas.width; x += grid) {
        const sx = x / canvas.width * 2.3 - 1.15;
        const sy = (1 - y / canvas.height) * 2.3 - 1.15;
        const p = window.LogisticCore.predict(result.model, { x: sx, y: sy });
        context.fillStyle = p >= 0.5 ? 'rgba(94,234,212,.14)' : 'rgba(248,113,113,.14)';
        context.fillRect(x, y, grid + 1, grid + 1);
      }
    }
    result.samples.forEach((sample) => {
      const p = project(sample);
      context.fillStyle = sample.label ? '#5eead4' : '#f87171';
      context.beginPath();
      context.arc(p.x, p.y, 4, 0, Math.PI * 2);
      context.fill();
    });
  }

  function update() {
    const count = Number(sampleRange.value);
    const epochs = Number(epochRange.value);
    const learningRate = Number(rateRange.value) / 100;
    latest = window.LogisticCore.analyze({ count, epochs, learningRate });
    draw(latest);
    sampleText.textContent = String(count);
    epochText.textContent = String(epochs);
    rateText.textContent = learningRate.toFixed(2);
    sampleBadge.textContent = `${count} samples`;
    accuracyBadge.textContent = `Accuracy ${Math.round(latest.metrics.accuracy * 100)}%`;
    statusBadge.textContent = 'Trained';
    sampleValue.textContent = String(latest.metrics.samples);
    epochValue.textContent = String(latest.metrics.epochs);
    lossValue.textContent = latest.metrics.loss.toFixed(3);
    accuracyValue.textContent = `${Math.round(latest.metrics.accuracy * 100)}%`;
    wxValue.textContent = latest.metrics.wx.toFixed(2);
    wyValue.textContent = latest.metrics.wy.toFixed(2);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.LogisticCore.benchmark({ count: Number(sampleRange.value), epochs: Number(epochRange.value), learningRate: Number(rateRange.value) / 100, runs: 10 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = `${Math.round(result.avgAccuracy * 100)}% avg`;
  });
  document.getElementById('pngButton').addEventListener('click', () => download('logistic-regression.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, model: latest.model }, null, 2);
    download('logistic-regression.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Logistic Regression Trainer: ${latest.metrics.samples} samples, loss ${latest.metrics.loss.toFixed(3)}, accuracy ${(latest.metrics.accuracy * 100).toFixed(1)}%.`);
    statusBadge.textContent = 'Report copied';
  });
  [sampleRange, epochRange, rateRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
