(function () {
  'use strict';

  const canvas = document.getElementById('avlCanvas');
  const context = canvas.getContext('2d');
  const countRange = document.getElementById('countRange');
  const countText = document.getElementById('countText');
  const countBadge = document.getElementById('countBadge');
  const heightBadge = document.getElementById('heightBadge');
  const statusBadge = document.getElementById('statusBadge');
  const keyValue = document.getElementById('keyValue');
  const heightValue = document.getElementById('heightValue');
  const rotationValue = document.getElementById('rotationValue');
  const balanceValue = document.getElementById('balanceValue');
  const limitValue = document.getElementById('limitValue');
  const validValue = document.getElementById('validValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function drawNode(root, x, y, spread) {
    if (!root) return;
    if (root.left) {
      context.strokeStyle = 'rgba(148, 163, 184, .32)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + 16);
      context.lineTo(x - spread, y + 78);
      context.stroke();
      drawNode(root.left, x - spread, y + 88, spread * 0.54);
    }
    if (root.right) {
      context.strokeStyle = 'rgba(148, 163, 184, .32)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + 16);
      context.lineTo(x + spread, y + 78);
      context.stroke();
      drawNode(root.right, x + spread, y + 88, spread * 0.54);
    }
    context.fillStyle = Math.abs(window.AvlCore.balance(root)) <= 1 ? '#5eead4' : '#fb7185';
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 24, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#061013';
    context.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(root.key), x, y - 3);
    context.fillText(`h${root.height}`, x, y + 10);
  }

  function draw(result) {
    context.fillStyle = '#071013';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawNode(result.root, canvas.width * 0.5, 52, canvas.width * 0.24);
  }

  function update() {
    const count = Number(countRange.value);
    latest = window.AvlCore.analyze({ count });
    draw(latest);
    countText.textContent = String(count);
    countBadge.textContent = `${count} keys`;
    heightBadge.textContent = `Height ${latest.metrics.height}`;
    statusBadge.textContent = latest.metrics.valid ? 'Balanced' : 'Invalid';
    keyValue.textContent = String(latest.metrics.keys);
    heightValue.textContent = String(latest.metrics.height);
    rotationValue.textContent = String(latest.metrics.rotations);
    balanceValue.textContent = String(latest.metrics.maxBalance);
    limitValue.textContent = String(latest.metrics.theoreticalMax);
    validValue.textContent = latest.metrics.valid ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.AvlCore.benchmark({ count: Number(countRange.value), runs: 24 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgRotations.toFixed(1)} rot avg`;
  });

  document.getElementById('pngButton').addEventListener('click', () => download('avl-tree.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, ordered: latest.ordered }, null, 2);
    download('avl-tree.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`AVL Tree Balancer: ${latest.metrics.keys} keys, height ${latest.metrics.height}, ${latest.metrics.rotations} rotations, valid ${latest.metrics.valid}.`);
    statusBadge.textContent = 'Report copied';
  });
  countRange.addEventListener('input', update);
  update();
}());
