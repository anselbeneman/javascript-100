(function () {
  'use strict';

  const canvas = document.getElementById('annealCanvas');
  const context = canvas.getContext('2d');
  const cityRange = document.getElementById('cityRange');
  const iterationRange = document.getElementById('iterationRange');
  const tempRange = document.getElementById('tempRange');
  const cityText = document.getElementById('cityText');
  const iterationText = document.getElementById('iterationText');
  const tempText = document.getElementById('tempText');
  const cityBadge = document.getElementById('cityBadge');
  const bestBadge = document.getElementById('bestBadge');
  const statusBadge = document.getElementById('statusBadge');
  const cityValue = document.getElementById('cityValue');
  const iterationValue = document.getElementById('iterationValue');
  const initialValue = document.getElementById('initialValue');
  const bestValue = document.getElementById('bestValue');
  const improveValue = document.getElementById('improveValue');
  const acceptedValue = document.getElementById('acceptedValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function project(city) {
    return { x: city.x * canvas.width, y: city.y * canvas.height };
  }

  function draw(result) {
    context.fillStyle = '#080b0e';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 3;
    context.beginPath();
    result.route.forEach((cityId, index) => {
      const p = project(result.cities[cityId]);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    const first = project(result.cities[result.route[0]]);
    context.lineTo(first.x, first.y);
    context.stroke();
    result.cities.forEach((city) => {
      const p = project(city);
      context.fillStyle = '#6ee7b7';
      context.beginPath();
      context.arc(p.x, p.y, 6, 0, Math.PI * 2);
      context.fill();
    });
  }

  function update() {
    const count = Number(cityRange.value);
    const iterations = Number(iterationRange.value);
    const temperature = Number(tempRange.value) / 100;
    latest = window.AnnealCore.analyze({ count, iterations, temperature });
    draw(latest);
    cityText.textContent = String(count);
    iterationText.textContent = String(iterations);
    tempText.textContent = temperature.toFixed(2);
    cityBadge.textContent = `${count} cities`;
    bestBadge.textContent = `Best ${latest.metrics.bestLength.toFixed(2)}`;
    statusBadge.textContent = 'Optimized';
    cityValue.textContent = String(latest.metrics.cities);
    iterationValue.textContent = String(latest.metrics.iterations);
    initialValue.textContent = latest.metrics.initialLength.toFixed(2);
    bestValue.textContent = latest.metrics.bestLength.toFixed(2);
    improveValue.textContent = `${Math.round(latest.metrics.improvement * 100)}%`;
    acceptedValue.textContent = `${Math.round(latest.metrics.acceptanceRate * 100)}%`;
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.AnnealCore.benchmark({ count: Number(cityRange.value), iterations: Number(iterationRange.value), temperature: Number(tempRange.value) / 100, runs: 8 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = `${Math.round(result.avgImprovement * 100)}% avg`;
  });
  document.getElementById('pngButton').addEventListener('click', () => download('simulated-annealing-route.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, route: latest.route, history: latest.history }, null, 2);
    download('simulated-annealing-route.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Simulated Annealing Route Lab: ${latest.metrics.cities} cities, route ${latest.metrics.initialLength.toFixed(2)} -> ${latest.metrics.bestLength.toFixed(2)}, improvement ${(latest.metrics.improvement * 100).toFixed(1)}%.`);
    statusBadge.textContent = 'Report copied';
  });
  [cityRange, iterationRange, tempRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
