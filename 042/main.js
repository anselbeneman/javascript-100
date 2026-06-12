(function () {
  'use strict';

  const canvas = document.getElementById('psoCanvas');
  const context = canvas.getContext('2d');
  const objectiveSelect = document.getElementById('objectiveSelect');
  const particleRange = document.getElementById('particleRange');
  const iterationRange = document.getElementById('iterationRange');
  const particleText = document.getElementById('particleText');
  const iterationText = document.getElementById('iterationText');
  const objectiveBadge = document.getElementById('objectiveBadge');
  const scoreBadge = document.getElementById('scoreBadge');
  const statusBadge = document.getElementById('statusBadge');
  const particleValue = document.getElementById('particleValue');
  const iterationValue = document.getElementById('iterationValue');
  const bestValue = document.getElementById('bestValue');
  const xValue = document.getElementById('xValue');
  const yValue = document.getElementById('yValue');
  const improveValue = document.getElementById('improveValue');
  const benchmarkValue = document.getElementById('benchmarkValue');
  let latest = null;

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function project(x, y) {
    return { x: canvas.width * (x + 3) / 6, y: canvas.height * (1 - (y + 3) / 6) };
  }

  function draw(result) {
    const objective = objectiveSelect.value;
    context.fillStyle = '#080711';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const cell = 24;
    for (let y = 0; y < canvas.height; y += cell) {
      for (let x = 0; x < canvas.width; x += cell) {
        const wx = x / canvas.width * 6 - 3;
        const wy = (1 - y / canvas.height) * 6 - 3;
        const value = Math.log1p(window.PsoCore.objective(objective, wx, wy));
        const shade = Math.max(0, Math.min(170, 170 - value * 28));
        context.fillStyle = `rgb(${18 + shade * 0.1}, ${20 + shade * 0.2}, ${32 + shade * 0.5})`;
        context.fillRect(x, y, cell + 1, cell + 1);
      }
    }
    result.swarm.forEach((particle) => {
      const p = project(particle.x, particle.y);
      context.fillStyle = 'rgba(125, 211, 252, .55)';
      context.beginPath();
      context.arc(p.x, p.y, 4, 0, Math.PI * 2);
      context.fill();
    });
    const best = project(result.global.x, result.global.y);
    context.strokeStyle = '#f7df1e';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(best.x, best.y, 16, 0, Math.PI * 2);
    context.stroke();
  }

  function update() {
    const particles = Number(particleRange.value);
    const iterations = Number(iterationRange.value);
    const objective = objectiveSelect.value;
    latest = window.PsoCore.analyze({ objective, count: particles, iterations });
    draw(latest);
    particleText.textContent = String(particles);
    iterationText.textContent = String(iterations);
    objectiveBadge.textContent = titleCase(objective);
    scoreBadge.textContent = `Score ${latest.metrics.bestScore.toExponential(2)}`;
    statusBadge.textContent = 'Optimized';
    particleValue.textContent = String(latest.metrics.particles);
    iterationValue.textContent = String(latest.metrics.iterations);
    bestValue.textContent = latest.metrics.bestScore.toExponential(2);
    xValue.textContent = latest.metrics.bestX.toFixed(3);
    yValue.textContent = latest.metrics.bestY.toFixed(3);
    improveValue.textContent = `${latest.metrics.improvement.toFixed(1)}x`;
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  document.getElementById('benchmarkButton').addEventListener('click', () => {
    const result = window.PsoCore.benchmark({ objective: objectiveSelect.value, count: Number(particleRange.value), iterations: Number(iterationRange.value), runs: 12 });
    benchmarkValue.textContent = `${result.avgMs.toFixed(2)} ms`;
    statusBadge.textContent = `avg ${result.avgBestScore.toExponential(1)}`;
  });
  document.getElementById('pngButton').addEventListener('click', () => download('particle-swarm.png', canvas.toDataURL('image/png')));
  document.getElementById('jsonButton').addEventListener('click', () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), metrics: latest.metrics, history: latest.history }, null, 2);
    download('particle-swarm.json', URL.createObjectURL(new Blob([payload], { type: 'application/json' })));
  });
  document.getElementById('reportButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`Particle Swarm Optimizer: best score ${latest.metrics.bestScore.toExponential(3)} at (${latest.metrics.bestX.toFixed(3)}, ${latest.metrics.bestY.toFixed(3)}).`);
    statusBadge.textContent = 'Report copied';
  });
  [objectiveSelect, particleRange, iterationRange].forEach((control) => control.addEventListener('input', update));
  update();
}());
