(function () {
  'use strict';

  const canvas = document.getElementById('minimaxCanvas');
  const context = canvas.getContext('2d');
  const presetSelect = document.getElementById('presetSelect');
  const presetBadge = document.getElementById('presetBadge');
  const moveBadge = document.getElementById('moveBadge');
  const statusBadge = document.getElementById('statusBadge');
  const playerValue = document.getElementById('playerValue');
  const moveValue = document.getElementById('moveValue');
  const scoreValue = document.getElementById('scoreValue');
  const nodeValue = document.getElementById('nodeValue');
  const pruneValue = document.getElementById('pruneValue');
  const legalValue = document.getElementById('legalValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function drawMark(mark, x, y, size) {
    context.lineWidth = 10;
    context.lineCap = 'round';
    if (mark === 'X') {
      context.strokeStyle = '#f7df1e';
      context.beginPath();
      context.moveTo(x - size, y - size);
      context.lineTo(x + size, y + size);
      context.moveTo(x + size, y - size);
      context.lineTo(x - size, y + size);
      context.stroke();
    } else if (mark === 'O') {
      context.strokeStyle = '#72ddf7';
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function draw(result) {
    context.fillStyle = '#07090f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const size = Math.min(canvas.width, canvas.height) * 0.62;
    const left = canvas.width * 0.5 - size * 0.5;
    const top = canvas.height * 0.5 - size * 0.5;
    const cell = size / 3;
    context.strokeStyle = 'rgba(245,247,251,.22)';
    context.lineWidth = 5;
    for (let index = 1; index < 3; index += 1) {
      context.beginPath();
      context.moveTo(left + cell * index, top);
      context.lineTo(left + cell * index, top + size);
      context.moveTo(left, top + cell * index);
      context.lineTo(left + size, top + cell * index);
      context.stroke();
    }

    result.nextBoard.forEach((mark, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = left + col * cell + cell * 0.5;
      const y = top + row * cell + cell * 0.5;
      if (index === result.move) {
        context.fillStyle = 'rgba(247,223,30,.16)';
        context.fillRect(left + col * cell + 8, top + row * cell + 8, cell - 16, cell - 16);
      }
      drawMark(mark, x, y, cell * 0.25);
    });
  }

  function update() {
    latest = window.MinimaxCore.analyze({ preset: presetSelect.value });
    draw(latest);
    presetBadge.textContent = titleCase(presetSelect.value);
    moveBadge.textContent = `Move ${latest.move}`;
    statusBadge.textContent = latest.metrics.outcome;
    playerValue.textContent = latest.player;
    moveValue.textContent = String(latest.move);
    scoreValue.textContent = String(latest.score);
    nodeValue.textContent = latest.metrics.nodes.toLocaleString();
    pruneValue.textContent = latest.metrics.prunes.toLocaleString();
    legalValue.textContent = String(latest.metrics.legalMoves);
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('solveButton').addEventListener('click', update);
  presetSelect.addEventListener('change', update);

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.MinimaxCore.benchmark({ runs: 45 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(3)} ms`;
    statusBadge.textContent = `${result.avgNodes.toFixed(0)} nodes avg`;
  });

  document.getElementById('pngButton').addEventListener('click', () => {
    download('minimax-game-solver.png', canvas.toDataURL('image/png'));
  });

  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), board: latest.board, nextBoard: latest.nextBoard, metrics: latest.metrics }, null, 2);
    download('minimax-game-solver.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });

  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Minimax Game Solver: best move ${latest.move}, score ${latest.score}, ${latest.metrics.nodes} nodes, ${latest.metrics.prunes} alpha-beta prunes.`);
    statusBadge.textContent = 'Report copied';
  });

  update();
}());
