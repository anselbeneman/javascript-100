(function attachClothCore(global) {
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

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function particleIndex(cols, x, y) {
    return y * cols + x;
  }

  function shouldPin(x, y, cols, mode) {
    if (y !== 0) return false;
    if (mode === 'corners') return x === 0 || x === cols - 1;
    if (mode === 'tabs') return x % Math.max(1, Math.floor(cols / 4)) === 0 || x === cols - 1;
    return true;
  }

  function createCloth(options = {}) {
    const cols = clamp(Math.round(options.cols || 22), 6, 46);
    const rows = clamp(Math.round(options.rows || 15), 5, 34);
    const pinMode = options.pinMode || 'top';
    const random = makeRng(options.seed || 20);
    const spacing = 0.72 / Math.max(cols - 1, rows - 1);
    const startX = 0.5 - spacing * (cols - 1) * 0.5;
    const startY = 0.16;
    const particles = [];
    const constraints = [];

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const jitter = y === 0 ? 0 : (random() - 0.5) * spacing * 0.05;
        const px = startX + x * spacing + jitter;
        const py = startY + y * spacing;
        particles.push({
          x: px,
          y: py,
          previousX: px,
          previousY: py,
          pinned: shouldPin(x, y, cols, pinMode),
        });
      }
    }

    function addConstraint(a, b, stiffness) {
      constraints.push({
        a,
        b,
        rest: distance(particles[a], particles[b]),
        stiffness,
      });
    }

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const current = particleIndex(cols, x, y);
        if (x < cols - 1) addConstraint(current, particleIndex(cols, x + 1, y), 1);
        if (y < rows - 1) addConstraint(current, particleIndex(cols, x, y + 1), 1);
        if (x < cols - 2) addConstraint(current, particleIndex(cols, x + 2, y), 0.42);
        if (y < rows - 2) addConstraint(current, particleIndex(cols, x, y + 2), 0.42);
      }
    }

    return {
      cols,
      rows,
      particles,
      constraints,
      obstacle: {
        x: 0.5,
        y: 0.68,
        radius: 0.085,
      },
      steps: 0,
      seed: options.seed || 20,
    };
  }

  function integrate(cloth, options = {}) {
    const dt = Number(options.dt || 1 / 60);
    const gravity = Number(options.gravity || 0.58);
    const wind = Number(options.wind || 0.1);
    const damping = clamp(Number(options.damping || 0.992), 0.94, 0.9995);
    const time = cloth.steps * dt;

    cloth.particles.forEach((particle, index) => {
      if (particle.pinned) return;

      const vx = (particle.x - particle.previousX) * damping;
      const vy = (particle.y - particle.previousY) * damping;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.x += vx + Math.sin(time * 2.2 + index * 0.37) * wind * dt * dt;
      particle.y += vy + gravity * dt * dt;
    });
  }

  function satisfyConstraints(cloth, iterations) {
    const solverIterations = clamp(Math.round(iterations || 8), 1, 36);

    for (let iteration = 0; iteration < solverIterations; iteration += 1) {
      cloth.constraints.forEach((constraint) => {
        const a = cloth.particles[constraint.a];
        const b = cloth.particles[constraint.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const current = Math.sqrt(dx * dx + dy * dy) || 1;
        const difference = (current - constraint.rest) / current;
        const correction = difference * 0.5 * constraint.stiffness;
        const cx = dx * correction;
        const cy = dy * correction;

        if (!a.pinned) {
          a.x += cx;
          a.y += cy;
        }

        if (!b.pinned) {
          b.x -= cx;
          b.y -= cy;
        }
      });

      collideObstacle(cloth);
      enforceBounds(cloth);
    }
  }

  function collideObstacle(cloth) {
    const obstacle = cloth.obstacle;
    cloth.particles.forEach((particle) => {
      if (particle.pinned) return;
      const dx = particle.x - obstacle.x;
      const dy = particle.y - obstacle.y;
      const value = Math.sqrt(dx * dx + dy * dy) || 1;
      if (value < obstacle.radius) {
        const push = obstacle.radius / value;
        particle.x = obstacle.x + dx * push;
        particle.y = obstacle.y + dy * push;
      }
    });
  }

  function enforceBounds(cloth) {
    cloth.particles.forEach((particle) => {
      if (particle.pinned) return;
      particle.x = clamp(particle.x, 0.04, 0.96);
      particle.y = clamp(particle.y, 0.05, 0.95);
    });
  }

  function stepCloth(cloth, options = {}) {
    integrate(cloth, options);
    satisfyConstraints(cloth, options.iterations || 8);
    cloth.steps += 1;
    return measureCloth(cloth);
  }

  function measureCloth(cloth) {
    let totalStretch = 0;
    let maxStretch = 0;
    let kinetic = 0;
    let pinned = 0;

    cloth.constraints.forEach((constraint) => {
      const a = cloth.particles[constraint.a];
      const b = cloth.particles[constraint.b];
      const stretch = Math.abs(distance(a, b) - constraint.rest) / constraint.rest;
      totalStretch += stretch;
      maxStretch = Math.max(maxStretch, stretch);
    });

    cloth.particles.forEach((particle) => {
      if (particle.pinned) pinned += 1;
      const vx = particle.x - particle.previousX;
      const vy = particle.y - particle.previousY;
      kinetic += vx * vx + vy * vy;
    });

    return {
      cols: cloth.cols,
      rows: cloth.rows,
      particles: cloth.particles.length,
      constraints: cloth.constraints.length,
      pinned,
      steps: cloth.steps,
      averageStretch: totalStretch / cloth.constraints.length,
      maxStretch,
      kineticEnergy: kinetic,
    };
  }

  function summarize(options = {}) {
    const cloth = createCloth(options);
    const steps = clamp(Math.round(options.steps || 180), 1, 720);
    const history = [];
    let metrics = measureCloth(cloth);

    for (let step = 0; step < steps; step += 1) {
      metrics = stepCloth(cloth, options);
      if (step % Math.max(1, Math.floor(steps / 48)) === 0 || step === steps - 1) {
        history.push({
          step: cloth.steps,
          averageStretch: metrics.averageStretch,
          maxStretch: metrics.maxStretch,
          kineticEnergy: metrics.kineticEnergy,
        });
      }
    }

    return { cloth, history, metrics };
  }

  function benchmarkCloth(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 8), 1, 60);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 20) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkCloth,
    createCloth,
    distance,
    makeRng,
    measureCloth,
    particleIndex,
    stepCloth,
    summarize,
  };

  global.ClothCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
