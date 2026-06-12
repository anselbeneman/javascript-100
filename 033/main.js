(function () {
  'use strict';

  const canvas = document.getElementById('huffmanCanvas');
  const context = canvas.getContext('2d');
  const sampleSelect = document.getElementById('sampleSelect');
  const textInput = document.getElementById('textInput');
  const sampleBadge = document.getElementById('sampleBadge');
  const ratioBadge = document.getElementById('ratioBadge');
  const statusBadge = document.getElementById('statusBadge');
  const symbolValue = document.getElementById('symbolValue');
  const uniqueValue = document.getElementById('uniqueValue');
  const bitValue = document.getElementById('bitValue');
  const fixedValue = document.getElementById('fixedValue');
  const ratioValue = document.getElementById('ratioValue');
  const depthValue = document.getElementById('depthValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  const decodeValue = document.getElementById('decodeValue');
  let latest = null;

  function draw(result) {
    const { width, height } = canvas;
    context.fillStyle = '#08080b';
    context.fillRect(0, 0, width, height);

    const rows = result.frequencies.slice(0, 22);
    const maxCount = Math.max(...rows.map((item) => item.count), 1);
    const rowH = Math.min(28, (height - 80) / Math.max(1, rows.length));
    context.font = '15px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.textBaseline = 'middle';

    rows.forEach((item, index) => {
      const y = 44 + index * rowH;
      const code = result.codes[item.char];
      const label = item.char === ' ' ? 'space' : item.char;
      const barW = item.count / maxCount * (width * 0.42);
      context.fillStyle = 'rgba(127, 225, 165, 0.20)';
      context.fillRect(150, y - rowH * 0.36, barW, rowH * 0.72);
      context.fillStyle = '#f7df1e';
      context.fillText(label, 34, y);
      context.fillStyle = '#f5f7fb';
      context.fillText(String(item.count), 92, y);
      context.fillStyle = '#7fe1a5';
      context.fillText(code, 180 + barW, y);
    });

    context.fillStyle = '#aab0bd';
    context.fillText('symbol', 34, 20);
    context.fillText('freq', 92, 20);
    context.fillText('prefix code', 220, 20);
  }

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function update() {
    const customText = textInput.value.trim();
    latest = window.HuffmanCore.analyze(customText ? { text: customText } : { sample: sampleSelect.value });
    draw(latest);

    sampleBadge.textContent = customText ? 'Custom' : titleCase(sampleSelect.value);
    ratioBadge.textContent = `Ratio ${Math.round(latest.metrics.ratio * 100)}%`;
    statusBadge.textContent = 'Encoded';
    symbolValue.textContent = latest.metrics.symbols.toLocaleString();
    uniqueValue.textContent = latest.metrics.uniqueSymbols.toLocaleString();
    bitValue.textContent = latest.metrics.encodedBits.toLocaleString();
    fixedValue.textContent = latest.metrics.fixedBits.toLocaleString();
    ratioValue.textContent = `${Math.round(latest.metrics.ratio * 100)}%`;
    depthValue.textContent = String(latest.metrics.treeDepth);
    decodeValue.textContent = latest.metrics.decodedMatches ? 'Match' : 'Mismatch';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('analyzeButton').addEventListener('click', update);
  sampleSelect.addEventListener('change', () => {
    textInput.value = '';
    update();
  });

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.HuffmanCore.benchmark({ runs: 40 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = 'Benchmarked';
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('huffman-compression.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, codes: latest.codes }, null, 2);
    download('huffman-compression.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Huffman Compression Lab: ${latest.metrics.symbols} symbols, ${latest.metrics.uniqueSymbols} unique, ${(latest.metrics.ratio * 100).toFixed(1)}% fixed-width ratio.`);
    statusBadge.textContent = 'Report copied';
  });

  update();
}());
