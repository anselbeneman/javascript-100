(function () {
  'use strict';

  const canvas = document.getElementById('btreeCanvas');
  const context = canvas.getContext('2d');
  const degreeRange = document.getElementById('degreeRange');
  const countRange = document.getElementById('countRange');
  const targetRange = document.getElementById('targetRange');
  const degreeText = document.getElementById('degreeText');
  const countText = document.getElementById('countText');
  const targetText = document.getElementById('targetText');
  const degreeBadge = document.getElementById('degreeBadge');
  const targetBadge = document.getElementById('targetBadge');
  const statusBadge = document.getElementById('statusBadge');
  const keyValue = document.getElementById('keyValue');
  const nodeValue = document.getElementById('nodeValue');
  const heightValue = document.getElementById('heightValue');
  const depthValue = document.getElementById('depthValue');
  const occupancyValue = document.getElementById('occupancyValue');
  const foundValue = document.getElementById('foundValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function collectLevels(node, depth = 0, levels = []) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    node.children.forEach((child) => collectLevels(child, depth + 1, levels));
    return levels;
  }

  function draw(result) {
    context.fillStyle = '#08090d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const levels = collectLevels(result.tree.root);
    const positions = new Map();
    levels.forEach((nodes, depth) => {
      nodes.forEach((node, index) => {
        positions.set(node, {
          x: (index + 1) / (nodes.length + 1) * canvas.width,
          y: 80 + depth * 130,
        });
      });
    });
    levels.forEach((nodes) => {
      nodes.forEach((node) => {
        const from = positions.get(node);
        node.children.forEach((child) => {
          const to = positions.get(child);
          context.strokeStyle = 'rgba(164,176,190,.28)';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(from.x, from.y + 22);
          context.lineTo(to.x, to.y - 22);
          context.stroke();
        });
      });
    });
    levels.flat().forEach((node) => {
      const position = positions.get(node);
      const width = Math.max(74, node.keys.length * 38 + 22);
      context.fillStyle = node.keys.includes(latest.target) ? '#f7df1e' : '#5eead4';
      context.strokeStyle = 'rgba(255,255,255,.38)';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(position.x - width / 2, position.y - 24, width, 48, 8);
      context.fill();
      context.stroke();
      context.fillStyle = '#061013';
      context.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(node.keys.join(' | '), position.x, position.y);
    });
  }

  function updateTargetLimit() {
    targetRange.max = String(Number(countRange.value) - 1);
    if (Number(targetRange.value) > Number(targetRange.max)) {
      targetRange.value = targetRange.max;
    }
  }

  function update() {
    updateTargetLimit();
    const degree = Number(degreeRange.value);
    const count = Number(countRange.value);
    const targetSlot = Number(targetRange.value);
    const preview = window.BTreeCore.buildTree({ degree, count });
    const target = preview.keys[targetSlot] || preview.keys[0];
    latest = window.BTreeCore.analyze({ degree, count, target });
    draw(latest);

    degreeText.textContent = String(degree);
    countText.textContent = String(count);
    targetText.textContent = String(targetSlot);
    degreeBadge.textContent = `Degree ${degree}`;
    targetBadge.textContent = `Target ${target}`;
    statusBadge.textContent = latest.search.found ? 'Found' : 'Missing';
    keyValue.textContent = String(latest.metrics.keys);
    nodeValue.textContent = String(latest.metrics.nodes);
    heightValue.textContent = String(latest.metrics.height);
    depthValue.textContent = String(latest.metrics.searchDepth);
    occupancyValue.textContent = `${Math.round(latest.metrics.averageOccupancy * 100)}%`;
    foundValue.textContent = latest.search.found ? 'Yes' : 'No';
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.BTreeCore.benchmark({ degree: Number(degreeRange.value), count: Number(countRange.value), runs: 24 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgSearchDepth.toFixed(1)} depth avg`;
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('btree-index.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, sortedKeys: latest.sortedKeys }, null, 2);
    download('btree-index.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`B-Tree Index Visualizer: ${latest.metrics.keys} keys, ${latest.metrics.nodes} nodes, height ${latest.metrics.height}, search depth ${latest.metrics.searchDepth}.`);
    statusBadge.textContent = 'Report copied';
  });

  [degreeRange, countRange, targetRange].forEach((control) => {
    control.addEventListener('input', update);
  });

  update();
}());
