(function attachParticlePhysicsCore(global) {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const DEFAULT_WIDTH = 1280;
  const DEFAULT_HEIGHT = 720;

  const presets = {
    orbit: {
      label: 'Orbit Field',
      count: 240,
      gravity: 0,
      drag: 0.995,
      restitution: 0.82,
      radius: 4.2,
      pointerForce: 0.9,
      centerForce: 0.86,
      swirlForce: 1.18,
      emitter: false,
      spread: 'disc',
      hueBase: 172,
      hueRange: 82,
    },
    granular: {
      label: 'Granular Fall',
      count: 360,
      gravity: 0.72,
      drag: 0.993,
      restitution: 0.43,
      radius: 3.2,
      pointerForce: 0.78,
      centerForce: 0,
      swirlForce: 0,
      emitter: false,
      spread: 'top',
      hueBase: 36,
      hueRange: 32,
    },
    fountain: {
      label: 'Fountain Lab',
      count: 280,
      gravity: 0.42,
      drag: 0.992,
      restitution: 0.68,
      radius: 3.6,
      pointerForce: 0.7,
      centerForce: 0.05,
      swirlForce: 0.18,
      emitter: true,
      spread: 'fountain',
      hueBase: 198,
      hueRange: 96,
    },
    magnetic: {
      label: 'Magnetic Swarm',
      count: 320,
      gravity: 0.02,
      drag: 0.997,
      restitution: 0.84,
      radius: 3.4,
      pointerForce: 1.22,
      centerForce: 0.16,
      swirlForce: 0.72,
      emitter: false,
      spread: 'random',
      hueBase: 308,
      hueRange: 78,
    },
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function createRng(seed) {
    let state = (Math.floor(seed) >>> 0) || 1;

    return function random() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function normalizeSettings(rawSettings) {
    const raw = rawSettings || {};
    const presetId = Object.prototype.hasOwnProperty.call(presets, raw.preset) ? raw.preset : 'orbit';
    const preset = presets[presetId];
    const width = clamp(Math.round(finiteOr(raw.width, DEFAULT_WIDTH)), 160, 4096);
    const height = clamp(Math.round(finiteOr(raw.height, DEFAULT_HEIGHT)), 160, 4096);

    return {
      preset: presetId,
      label: preset.label,
      width,
      height,
      count: clamp(Math.round(finiteOr(raw.count, preset.count)), 20, 1200),
      gravity: clamp(finiteOr(raw.gravity, preset.gravity), -1.5, 2.5),
      drag: clamp(finiteOr(raw.drag, preset.drag), 0.94, 0.9998),
      restitution: clamp(finiteOr(raw.restitution, preset.restitution), 0.05, 0.98),
      radius: clamp(finiteOr(raw.radius, preset.radius), 1.5, 16),
      pointerForce: clamp(finiteOr(raw.pointerForce, preset.pointerForce), 0, 2.5),
      pointerMode: ['attract', 'repel', 'stir'].includes(raw.pointerMode) ? raw.pointerMode : 'attract',
      collisions: raw.collisions !== false,
      trails: raw.trails !== false,
      showGrid: raw.showGrid === true,
      centerForce: preset.centerForce,
      swirlForce: preset.swirlForce,
      emitter: preset.emitter,
      spread: preset.spread,
      hueBase: preset.hueBase,
      hueRange: preset.hueRange,
      floorFriction: presetId === 'granular' ? 0.82 : 0.96,
    };
  }

  function createParticle(index, settings, random) {
    const radius = settings.radius * (0.72 + random() * 0.58);
    const mass = radius * radius;
    const cx = settings.width * 0.5;
    const cy = settings.height * 0.5;
    let x = cx;
    let y = cy;
    let vx = 0;
    let vy = 0;

    if (settings.spread === 'disc') {
      const angle = random() * TWO_PI;
      const distance = Math.sqrt(random()) * Math.min(settings.width, settings.height) * 0.34;
      x = cx + Math.cos(angle) * distance;
      y = cy + Math.sin(angle) * distance;
      vx = -Math.sin(angle) * (70 + random() * 110);
      vy = Math.cos(angle) * (70 + random() * 110);
    } else if (settings.spread === 'top') {
      x = settings.width * (0.12 + random() * 0.76);
      y = settings.height * (0.05 + random() * 0.24);
      vx = (random() - 0.5) * 70;
      vy = random() * 50;
    } else if (settings.spread === 'fountain') {
      x = cx + (random() - 0.5) * settings.width * 0.08;
      y = settings.height * (0.78 + random() * 0.08);
      vx = (random() - 0.5) * 220;
      vy = -360 - random() * 260;
    } else {
      x = settings.width * (0.08 + random() * 0.84);
      y = settings.height * (0.08 + random() * 0.84);
      vx = (random() - 0.5) * 220;
      vy = (random() - 0.5) * 220;
    }

    return {
      x,
      y,
      vx,
      vy,
      radius,
      mass,
      hue: (settings.hueBase + random() * settings.hueRange + index * 0.17) % 360,
      heat: 0.25 + random() * 0.75,
    };
  }

  function createWorld(rawSettings, seed) {
    const settings = normalizeSettings(rawSettings);
    const random = createRng(seed || 1);
    const particles = [];

    for (let index = 0; index < settings.count; index += 1) {
      particles.push(createParticle(index, settings, random));
    }

    return {
      width: settings.width,
      height: settings.height,
      seed: (Math.floor(seed) >>> 0) || 1,
      frame: 0,
      time: 0,
      emitCursor: 0,
      particles,
      metrics: computeMetrics({ particles, width: settings.width, height: settings.height }, null),
    };
  }

  function resizeWorld(world, width, height) {
    const nextWidth = clamp(Math.round(finiteOr(width, world.width || DEFAULT_WIDTH)), 160, 4096);
    const nextHeight = clamp(Math.round(finiteOr(height, world.height || DEFAULT_HEIGHT)), 160, 4096);
    const scaleX = nextWidth / finiteOr(world.width, nextWidth);
    const scaleY = nextHeight / finiteOr(world.height, nextHeight);

    world.particles.forEach((particle) => {
      particle.x = clamp(particle.x * scaleX, particle.radius, nextWidth - particle.radius);
      particle.y = clamp(particle.y * scaleY, particle.radius, nextHeight - particle.radius);
    });

    world.width = nextWidth;
    world.height = nextHeight;
  }

  function ensureParticleCount(world, settings) {
    const current = world.particles.length;

    if (current === settings.count) {
      return;
    }

    if (current > settings.count) {
      world.particles.length = settings.count;
      return;
    }

    const random = createRng(world.seed + world.frame * 977 + current * 131);
    for (let index = current; index < settings.count; index += 1) {
      world.particles.push(createParticle(index, settings, random));
    }
  }

  function buildSpatialGrid(particles, cellSize, width, height) {
    const safeCellSize = Math.max(4, finiteOr(cellSize, 16));
    const columns = Math.max(1, Math.ceil(width / safeCellSize));
    const rows = Math.max(1, Math.ceil(height / safeCellSize));
    const cells = new Map();

    particles.forEach((particle, index) => {
      const gx = clamp(Math.floor(particle.x / safeCellSize), 0, columns - 1);
      const gy = clamp(Math.floor(particle.y / safeCellSize), 0, rows - 1);
      const key = `${gx},${gy}`;
      let bucket = cells.get(key);

      if (!bucket) {
        bucket = [];
        cells.set(key, bucket);
      }
      bucket.push(index);
    });

    return {
      cellSize: safeCellSize,
      columns,
      rows,
      cells,
    };
  }

  function resolveParticlePair(a, b, restitution) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDistance = a.radius + b.radius;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared >= minDistance * minDistance || distanceSquared <= 0.0001) {
      return false;
    }

    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;
    const invMassA = 1 / a.mass;
    const invMassB = 1 / b.mass;
    const invMassTotal = invMassA + invMassB;

    a.x -= nx * overlap * (invMassA / invMassTotal);
    a.y -= ny * overlap * (invMassA / invMassTotal);
    b.x += nx * overlap * (invMassB / invMassTotal);
    b.y += ny * overlap * (invMassB / invMassTotal);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velocityAlongNormal = rvx * nx + rvy * ny;

    if (velocityAlongNormal < 0) {
      const impulse = (-(1 + restitution) * velocityAlongNormal) / invMassTotal;
      const ix = impulse * nx;
      const iy = impulse * ny;
      a.vx -= ix * invMassA;
      a.vy -= iy * invMassA;
      b.vx += ix * invMassB;
      b.vy += iy * invMassB;
    }

    a.heat = clamp(a.heat + 0.04, 0, 1.4);
    b.heat = clamp(b.heat + 0.04, 0, 1.4);
    return true;
  }

  function resolveCollisions(world, settings, grid) {
    const neighborOffsets = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    let checks = 0;
    let collisions = 0;

    grid.cells.forEach((bucket, key) => {
      const splitIndex = key.indexOf(',');
      const gx = Number(key.slice(0, splitIndex));
      const gy = Number(key.slice(splitIndex + 1));

      neighborOffsets.forEach((offset) => {
        const nx = gx + offset[0];
        const ny = gy + offset[1];

        if (nx < 0 || ny < 0 || nx >= grid.columns || ny >= grid.rows) {
          return;
        }

        const neighbor = grid.cells.get(`${nx},${ny}`);
        if (!neighbor) {
          return;
        }

        for (let aIndex = 0; aIndex < bucket.length; aIndex += 1) {
          const startIndex = neighbor === bucket ? aIndex + 1 : 0;

          for (let bIndex = startIndex; bIndex < neighbor.length; bIndex += 1) {
            checks += 1;
            if (resolveParticlePair(
              world.particles[bucket[aIndex]],
              world.particles[neighbor[bIndex]],
              settings.restitution,
            )) {
              collisions += 1;
            }
          }
        }
      });
    });

    return { checks, collisions };
  }

  function applyBounds(particle, settings) {
    const right = settings.width - particle.radius;
    const bottom = settings.height - particle.radius;

    if (particle.x < particle.radius) {
      particle.x = particle.radius;
      particle.vx = Math.abs(particle.vx) * settings.restitution;
    } else if (particle.x > right) {
      particle.x = right;
      particle.vx = -Math.abs(particle.vx) * settings.restitution;
    }

    if (particle.y < particle.radius) {
      particle.y = particle.radius;
      particle.vy = Math.abs(particle.vy) * settings.restitution;
    } else if (particle.y > bottom) {
      particle.y = bottom;
      particle.vy = -Math.abs(particle.vy) * settings.restitution;
      particle.vx *= settings.floorFriction;
    }
  }

  function applyPointerForce(particle, settings, pointer, dt) {
    if (!pointer || !pointer.active || settings.pointerForce <= 0) {
      return;
    }

    const dx = pointer.x - particle.x;
    const dy = pointer.y - particle.y;
    const range = 78 + settings.radius * 18 + settings.pointerForce * 36;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > range * range || distanceSquared <= 0.01) {
      return;
    }

    const distance = Math.sqrt(distanceSquared);
    const falloff = (1 - distance / range) ** 2;
    const nx = dx / distance;
    const ny = dy / distance;
    const mode = pointer.mode || settings.pointerMode;
    const strength = settings.pointerForce * 1450 * falloff * dt * (pointer.down ? 1.35 : 0.78);

    if (mode === 'repel') {
      particle.vx -= nx * strength;
      particle.vy -= ny * strength;
    } else if (mode === 'stir') {
      particle.vx += -ny * strength;
      particle.vy += nx * strength;
    } else {
      particle.vx += nx * strength;
      particle.vy += ny * strength;
    }

    particle.heat = clamp(particle.heat + falloff * 0.05, 0, 1.5);
  }

  function applyPresetForces(particle, settings, dt) {
    if (settings.gravity !== 0) {
      particle.vy += settings.gravity * 680 * dt;
    }

    const cx = settings.width * 0.5;
    const cy = settings.height * 0.5;
    const dx = cx - particle.x;
    const dy = cy - particle.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > 16) {
      const distance = Math.sqrt(distanceSquared);
      const nx = dx / distance;
      const ny = dy / distance;
      const centerAcceleration = settings.centerForce * 220 * dt;
      const swirlAcceleration = settings.swirlForce * 160 * dt;

      particle.vx += nx * centerAcceleration;
      particle.vy += ny * centerAcceleration;
      particle.vx += -ny * swirlAcceleration;
      particle.vy += nx * swirlAcceleration;
    }
  }

  function emitFountainParticles(world, settings) {
    if (!settings.emitter || world.particles.length === 0) {
      return;
    }

    const random = createRng(world.seed + world.frame * 37);
    const amount = Math.max(2, Math.round(world.particles.length / 96));

    for (let index = 0; index < amount; index += 1) {
      const particle = world.particles[world.emitCursor % world.particles.length];
      const spread = (random() - 0.5) * settings.width * 0.045;
      particle.x = settings.width * 0.5 + spread;
      particle.y = settings.height * 0.82 + random() * 12;
      particle.vx = spread * 5 + (random() - 0.5) * 110;
      particle.vy = -420 - random() * 260;
      particle.heat = 1;
      particle.hue = (settings.hueBase + random() * settings.hueRange) % 360;
      world.emitCursor += 1;
    }
  }

  function createBurst(world, rawSettings, x, y, amount, strength, seed) {
    const settings = normalizeSettings({
      ...rawSettings,
      width: world.width,
      height: world.height,
    });
    const random = createRng(seed || world.seed + world.frame * 2654435761);
    const total = Math.min(world.particles.length, Math.max(1, Math.round(amount || 18)));
    const burstStrength = finiteOr(strength, 460);

    for (let index = 0; index < total; index += 1) {
      const particle = world.particles[(world.frame + index * 17) % world.particles.length];
      const angle = random() * TWO_PI;
      const distance = random() * settings.radius * 8;
      particle.x = clamp(x + Math.cos(angle) * distance, particle.radius, settings.width - particle.radius);
      particle.y = clamp(y + Math.sin(angle) * distance, particle.radius, settings.height - particle.radius);
      particle.vx = Math.cos(angle) * burstStrength * (0.45 + random() * 0.85);
      particle.vy = Math.sin(angle) * burstStrength * (0.45 + random() * 0.85);
      particle.heat = 1.2;
      particle.hue = (settings.hueBase + random() * settings.hueRange) % 360;
    }

    return total;
  }

  function stepSimulation(world, rawSettings, dt, pointer) {
    const settings = normalizeSettings({
      ...rawSettings,
      width: world.width,
      height: world.height,
    });
    const safeDt = clamp(finiteOr(dt, 1 / 60), 1 / 240, 1 / 24);
    const damping = Math.pow(settings.drag, safeDt * 60);

    ensureParticleCount(world, settings);
    emitFountainParticles(world, settings);

    world.particles.forEach((particle) => {
      applyPresetForces(particle, settings, safeDt);
      applyPointerForce(particle, settings, pointer, safeDt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * safeDt;
      particle.y += particle.vy * safeDt;
      particle.heat *= 0.992;
      applyBounds(particle, settings);
    });

    const gridCellSize = Math.max(settings.radius * 3.2, 14);
    const grid = buildSpatialGrid(world.particles, gridCellSize, settings.width, settings.height);
    const collisionStats = settings.collisions
      ? resolveCollisions(world, settings, grid)
      : { checks: 0, collisions: 0 };

    if (settings.collisions) {
      world.particles.forEach((particle) => applyBounds(particle, settings));
    }

    world.frame += 1;
    world.time += safeDt;
    world.metrics = computeMetrics(world, {
      checks: collisionStats.checks,
      collisions: collisionStats.collisions,
      gridCells: grid.cells.size,
      gridColumns: grid.columns,
      gridRows: grid.rows,
      gridCellSize,
    });

    return world.metrics;
  }

  function computeMetrics(world, stats) {
    const particles = world.particles || [];
    let energy = 0;
    let maxSpeed = 0;
    let cx = 0;
    let cy = 0;
    let totalMass = 0;

    particles.forEach((particle) => {
      const speedSquared = particle.vx * particle.vx + particle.vy * particle.vy;
      const speed = Math.sqrt(speedSquared);
      const mass = finiteOr(particle.mass, 1);
      energy += 0.5 * mass * speedSquared;
      maxSpeed = Math.max(maxSpeed, speed);
      cx += particle.x * mass;
      cy += particle.y * mass;
      totalMass += mass;
    });

    const gridCells = stats ? stats.gridCells : 0;
    const spread = particles.length > 0 ? gridCells / particles.length : 0;

    return {
      particles: particles.length,
      energy,
      averageEnergy: particles.length > 0 ? energy / particles.length : 0,
      maxSpeed,
      centerX: totalMass > 0 ? cx / totalMass : 0,
      centerY: totalMass > 0 ? cy / totalMass : 0,
      checks: stats ? stats.checks : 0,
      collisions: stats ? stats.collisions : 0,
      gridCells,
      gridColumns: stats ? stats.gridColumns : 0,
      gridRows: stats ? stats.gridRows : 0,
      gridCellSize: stats ? stats.gridCellSize : 0,
      spread,
    };
  }

  global.ParticlePhysicsCore = Object.freeze({
    presets,
    presetIds: Object.keys(presets),
    clamp,
    createRng,
    normalizeSettings,
    createWorld,
    resizeWorld,
    buildSpatialGrid,
    createBurst,
    stepSimulation,
    computeMetrics,
  });
}(typeof window !== 'undefined' ? window : globalThis));
