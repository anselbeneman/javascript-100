(function () {
  'use strict';

  const canvas = document.getElementById('treeCanvas');
  const context = canvas.getContext('2d');
  const depthRange = document.getElementById('depthRange');
  const rowRange = document.getElementById('rowRange');
  const seedRange = document.getElementById('seedRange');
  const depthValue = document.getElementById('depthValue');
  const rowsValue = document.getElementById('rowsValue');
  const seedValue = document.getElementById('seedValue');
  const depthBadge = document.getElementById('depthBadge');
  const accuracyBadge = document.getElementById('accuracyBadge');
  const statusBadge = document.getElementById('statusBadge');
  const rowValue = document.getElementById('rowValue');
  const nodeValue = document.getElementById('nodeValue');
  const trainValue = document.getElementById('trainValue');
  const testValue = document.getElementById('testValue');
  const impurityValue = document.getElementById('impurityValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function drawNode(node, x, y, span) {
    const isLeaf = node.type === 'leaf';
    const label = isLeaf ? node.label : `${node.feature} <= ${node.threshold.toFixed(2)}`;
    context.fillStyle = isLeaf ? (node.label === 'hire' ? '#2dd4bf' : '#fb7185') : '#f7df1e';
    context.strokeStyle = 'rgba(255,255,255,.28)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.roundRect(x - 70, y - 22, 140, 44, 8);
    context.fill();
    context.stroke();
    context.fillStyle = '#061013';
    context.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x, y - 5);
    context.fillText(`${node.rows} rows`, x, y + 11);

    if (node.type === 'split') {
      const nextY = y + 94;
      const leftX = x - span;
      const rightX = x + span;
      context.strokeStyle = 'rgba(210, 220, 230, .42)';
      context.beginPath();
      context.moveTo(x - 24, y + 22);
      context.lineTo(leftX, nextY - 24);
      context.moveTo(x + 24, y + 22);
      context.lineTo(rightX, nextY - 24);
      context.stroke();
      drawNode(node.left, leftX, nextY, span * 0.52);
      drawNode(node.right, rightX, nextY, span * 0.52);
    }
  }

  function draw(result) {
    context.fillStyle = '#061013';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawNode(result.tree, canvas.width * 0.5, 58, canvas.width * 0.24);
  }

  function update() {
    const maxDepth = Number(depthRange.value);
    const count = Number(rowRange.value);
    const seed = Number(seedRange.value);
    latest = window.TreeCore.analyze({ maxDepth, count, seed });
    draw(latest);

    depthValue.textContent = String(maxDepth);
    rowsValue.textContent = String(count);
    seedValue.textContent = String(seed);
    depthBadge.textContent = `Depth ${maxDepth}`;
    accuracyBadge.textContent = `Accuracy ${Math.round(latest.metrics.testAccuracy * 100)}%`;
    statusBadge.textContent = 'Trained';
    rowValue.textContent = latest.metrics.rows.toLocaleString();
    nodeValue.textContent = latest.metrics.nodes.toLocaleString();
    trainValue.textContent = `${Math.round(latest.metrics.trainAccuracy * 100)}%`;
    testValue.textContent = `${Math.round(latest.metrics.testAccuracy * 100)}%`;
    impurityValue.textContent = latest.metrics.rootImpurity.toFixed(3);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.TreeCore.benchmark({ count: Number(rowRange.value), maxDepth: Number(depthRange.value), runs: 16 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = `${Math.round(result.avgAccuracy * 100)}% avg`;
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('decision-tree.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, tree: latest.tree }, null, 2);
    download('decision-tree.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Decision Tree Lab: ${latest.metrics.nodes} nodes, ${(latest.metrics.testAccuracy * 100).toFixed(1)}% test accuracy on ${latest.metrics.testRows} held-out rows.`);
    statusBadge.textContent = 'Report copied';
  });

  [depthRange, rowRange, seedRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
