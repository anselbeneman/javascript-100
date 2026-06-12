(function () {
  'use strict';

  const canvas = document.getElementById('fftCanvas');
  const context = canvas.getContext('2d');
  const baseRange = document.getElementById('baseRange');
  const secondRange = document.getElementById('secondRange');
  const mixRange = document.getElementById('mixRange');
  const baseValue = document.getElementById('baseValue');
  const secondValue = document.getElementById('secondValue');
  const mixValue = document.getElementById('mixValue');
  const baseBadge = document.getElementById('baseBadge');
  const peakBadge = document.getElementById('peakBadge');
  const statusBadge = document.getElementById('statusBadge');
  const sampleValue = document.getElementById('sampleValue');
  const binValue = document.getElementById('binValue');
  const peakValue = document.getElementById('peakValue');
  const magValue = document.getElementById('magValue');
  const rmsValue = document.getElementById('rmsValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function draw(result) {
    const { width, height } = canvas;
    context.fillStyle = '#050711';
    context.fillRect(0, 0, width, height);
    const split = height * 0.42;

    context.strokeStyle = 'rgba(115, 230, 255, 0.88)';
    context.lineWidth = 2;
    context.beginPath();
    result.samples.forEach((sample, index) => {
      const x = index / (result.samples.length - 1) * width;
      const y = split * 0.5 - sample * split * 0.22 + 24;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    const maxMag = Math.max(...result.bins.map((bin) => bin.magnitude));
    const chartTop = split + 24;
    const chartHeight = height - chartTop - 36;
    const visibleBins = result.bins.slice(0, 160);
    const barW = width / visibleBins.length;
    visibleBins.forEach((bin, index) => {
      const h = bin.magnitude / Math.max(1e-9, maxMag) * chartHeight;
      context.fillStyle = result.peaks.some((peak) => peak.bin === bin.bin) ? '#f7df1e' : 'rgba(115, 230, 255, 0.48)';
      context.fillRect(index * barW, chartTop + chartHeight - h, Math.max(1, barW - 1), h);
    });
  }

  function update() {
    const base = Number(baseRange.value);
    const second = Number(secondRange.value);
    const mix = Number(mixRange.value) / 100;
    latest = window.FftCore.analyze({ base, second, mix });
    draw(latest);

    baseValue.textContent = `${base} Hz`;
    secondValue.textContent = `${second} Hz`;
    mixValue.textContent = mix.toFixed(2);
    baseBadge.textContent = `${base} Hz`;
    peakBadge.textContent = `Peak ${latest.metrics.peakHz.toFixed(0)} Hz`;
    statusBadge.textContent = 'Analyzed';
    sampleValue.textContent = latest.metrics.sampleCount.toLocaleString();
    binValue.textContent = latest.metrics.binCount.toLocaleString();
    peakValue.textContent = latest.metrics.peakHz.toFixed(0);
    magValue.textContent = latest.metrics.peakMagnitude.toFixed(3);
    rmsValue.textContent = latest.metrics.rms.toFixed(3);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.FftCore.benchmark({
      base: Number(baseRange.value),
      second: Number(secondRange.value),
      mix: Number(mixRange.value) / 100,
      runs: 32,
    });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('fft-spectrum.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, peaks: latest.peaks }, null, 2);
    download('fft-spectrum.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    const peaks = latest.peaks.slice(0, 3).map((peak) => `${peak.hz.toFixed(0)} Hz`).join(', ');
    await navigator.clipboard.writeText(`FFT Spectrum Analyzer: ${latest.metrics.sampleCount} samples, dominant peaks ${peaks}.`);
    statusBadge.textContent = 'Report copied';
  });

  [baseRange, secondRange, mixRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
