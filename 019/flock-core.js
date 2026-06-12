(function attachFlockCore(global) {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function makeRng(seed) {
    let state = (seed >>> 0) || 1;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function wrap01(value) {
    if (value < 0) return value + 1;
    if (value > 1) return value - 1;
    return value;
  }

  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function limitVector(vector, maxLength) {
    const value = length(vector.x, vector.y);
    if (value > maxLength && value > 0) {
      vector.x = vector.x / value * maxLength;
      vector.y = vector.y / value * maxLength;
    }
    return vector;
  }

  function createAgents(options = {}) {
    const count = clamp(Math.round(options.count || 180), 24, 520);
    const preset = options.preset || 'vortex';
    const random = makeRng(options.seed || 19);
    const agents = [];

    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count;
      const ring = 0.18 + random() * 0.32;
      let x = 0.5 + Math.cos(angle) * ring;
      let y = 0.5 + Math.sin(angle) * ring;
      let vx = -Math.sin(angle) * 0.18;
      let vy = Math.cos(angle) * 0.18;

      if (preset === 'swarm') {
        x = 0.18 + random() * 0.64;
        y = 0.18 + random() * 0.64;
        vx = (random() - 0.5) * 0.24;
        vy = (random() - 0.5) * 0.24;
      } else if (preset === 'lanes') {
        x = random();
        y = 0.18 + (index % 5) * 0.16 + (random() - 0.5) * 0.035;
        vx = 0.12 + random() * 0.08;
        vy = (random() - 0.5) * 0.035;
      } else if (preset === 'split') {
        x = index % 2 === 0 ? 0.24 + random() * 0.1 : 0.66 + random() * 0.1;
        y = 0.18 + random() * 0.64;
        vx = index % 2 === 0 ? 0.2 : -0.2;
        vy = (random() - 0.5) * 0.08;
      }

      agents.push({
        id: index,
        x: wrap01(x),
        y: wrap01(y),
        vx,
        vy,
        ax: 0,
        ay: 0,
      });
    }

    return agents;
  }

  function cellKey(x, y) {
    return `${x}:${y}`;
  }

  function buildSpatialHash(agents, cellSize) {
    const safeCellSize = clamp(Number(cellSize || 0.09), 0.025, 0.24);
    const cells = new Map();

    agents.forEach((agent, index) => {
      const cx = Math.floor(agent.x / safeCellSize);
      const cy = Math.floor(agent.y / safeCellSize);
      const key = cellKey(cx, cy);
      if (!cells.has(key)) {
        cells.set(key, []);
      }
      cells.get(key).push(index);
    });

    return { cells, cellSize: safeCellSize };
  }

  function queryNeighbors(agents, hash, agent, perception) {
    const cellSize = hash.cellSize;
    const cx = Math.floor(agent.x / cellSize);
    const cy = Math.floor(agent.y / cellSize);
    const radius = Math.ceil(perception / cellSize);
    const neighbors = [];
    let checks = 0;

    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        const bucket = hash.cells.get(cellKey(x, y));
        if (!bucket) continue;

        bucket.forEach((candidateIndex) => {
          const candidate = agents[candidateIndex];
          if (candidate.id === agent.id) return;

          checks += 1;
          const dx = candidate.x - agent.x;
          const dy = candidate.y - agent.y;
          const distance = length(dx, dy);
          if (distance > 0 && distance < perception) {
            neighbors.push({ agent: candidate, dx, dy, distance });
          }
        });
      }
    }

    return { neighbors, checks };
  }

  function createScene(options = {}) {
    return {
      agents: createAgents(options),
      time: 0,
      steps: 0,
      lastMetrics: null,
      settings: {
        seed: options.seed || 19,
        preset: options.preset || 'vortex',
      },
    };
  }

  function stepScene(scene, options = {}) {
    const perception = clamp(Number(options.perception || 0.105), 0.035, 0.22);
    const separationRadius = perception * 0.48;
    const maxSpeed = clamp(Number(options.maxSpeed || 0.34), 0.08, 0.72);
    const maxForce = clamp(Number(options.maxForce || 0.022), 0.003, 0.08);
    const dt = Number(options.dt || 1 / 30);
    const separationWeight = Number(options.separation || 1.28);
    const alignmentWeight = Number(options.alignment || 0.82);
    const cohesionWeight = Number(options.cohesion || 0.62);
    const hash = buildSpatialHash(scene.agents, perception);
    let neighborChecks = 0;
    let neighborTotal = 0;

    scene.agents.forEach((agent) => {
      const query = queryNeighbors(scene.agents, hash, agent, perception);
      const neighbors = query.neighbors;
      neighborChecks += query.checks;
      neighborTotal += neighbors.length;

      let sepX = 0;
      let sepY = 0;
      let aliX = 0;
      let aliY = 0;
      let cohX = 0;
      let cohY = 0;

      neighbors.forEach((neighbor) => {
        if (neighbor.distance < separationRadius) {
          const force = (separationRadius - neighbor.distance) / separationRadius;
          sepX -= neighbor.dx / neighbor.distance * force;
          sepY -= neighbor.dy / neighbor.distance * force;
        }

        aliX += neighbor.agent.vx;
        aliY += neighbor.agent.vy;
        cohX += neighbor.agent.x;
        cohY += neighbor.agent.y;
      });

      if (neighbors.length > 0) {
        const inv = 1 / neighbors.length;
        aliX *= inv;
        aliY *= inv;
        const limitedAlignment = limitVector({ x: aliX, y: aliY }, maxSpeed);
        aliX = limitedAlignment.x - agent.vx;
        aliY = limitedAlignment.y - agent.vy;

        cohX = cohX * inv - agent.x;
        cohY = cohY * inv - agent.y;
      }

      const steer = limitVector({
        x: sepX * separationWeight + aliX * alignmentWeight + cohX * cohesionWeight,
        y: sepY * separationWeight + aliY * alignmentWeight + cohY * cohesionWeight,
      }, maxForce);

      agent.ax = steer.x;
      agent.ay = steer.y;
    });

    scene.agents.forEach((agent) => {
      agent.vx += agent.ax;
      agent.vy += agent.ay;
      const limitedVelocity = limitVector({ x: agent.vx, y: agent.vy }, maxSpeed);
      agent.vx = limitedVelocity.x;
      agent.vy = limitedVelocity.y;
      agent.x = wrap01(agent.x + agent.vx * dt);
      agent.y = wrap01(agent.y + agent.vy * dt);
    });

    scene.time += dt;
    scene.steps += 1;
    scene.lastMetrics = measureScene(scene, {
      cells: hash.cells.size,
      neighborChecks,
      averageNeighbors: neighborTotal / scene.agents.length,
      naiveChecks: scene.agents.length * (scene.agents.length - 1),
    });

    return scene.lastMetrics;
  }

  function measureScene(scene, searchMetrics = {}) {
    let speed = 0;
    let vx = 0;
    let vy = 0;
    let centerX = 0;
    let centerY = 0;

    scene.agents.forEach((agent) => {
      const agentSpeed = length(agent.vx, agent.vy);
      speed += agentSpeed;
      if (agentSpeed > 0) {
        vx += agent.vx / agentSpeed;
        vy += agent.vy / agentSpeed;
      }
      centerX += agent.x;
      centerY += agent.y;
    });

    const count = scene.agents.length;
    centerX /= count;
    centerY /= count;

    let spread = 0;
    scene.agents.forEach((agent) => {
      spread += length(agent.x - centerX, agent.y - centerY);
    });

    return {
      agents: count,
      steps: scene.steps,
      averageSpeed: speed / count,
      polarization: length(vx / count, vy / count),
      centerSpread: spread / count,
      gridCells: searchMetrics.cells || 0,
      neighborChecks: searchMetrics.neighborChecks || 0,
      naiveChecks: searchMetrics.naiveChecks || count * (count - 1),
      averageNeighbors: searchMetrics.averageNeighbors || 0,
      searchReduction: searchMetrics.naiveChecks ? 1 - searchMetrics.neighborChecks / searchMetrics.naiveChecks : 0,
    };
  }

  function summarize(options = {}) {
    const scene = createScene(options);
    const frames = clamp(Math.round(options.frames || 180), 1, 720);
    const history = [];
    let metrics = measureScene(scene);

    for (let frame = 0; frame < frames; frame += 1) {
      metrics = stepScene(scene, options);
      if (frame % Math.max(1, Math.floor(frames / 48)) === 0 || frame === frames - 1) {
        history.push({
          step: scene.steps,
          averageSpeed: metrics.averageSpeed,
          polarization: metrics.polarization,
          averageNeighbors: metrics.averageNeighbors,
        });
      }
    }

    return { scene, history, metrics };
  }

  function benchmarkFlock(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 10), 1, 80);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 19) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkFlock,
    buildSpatialHash,
    createAgents,
    createScene,
    makeRng,
    measureScene,
    queryNeighbors,
    stepScene,
    summarize,
  };

  global.FlockCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
