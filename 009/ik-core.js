(function () {
  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clonePoint(point) {
    return { x: point.x, y: point.y };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function normalize(dx, dy) {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  function pointAlong(anchor, moving, length) {
    const direction = normalize(moving.x - anchor.x, moving.y - anchor.y);
    return {
      x: anchor.x + direction.x * length,
      y: anchor.y + direction.y * length,
    };
  }

  function rotatePoint(point, pivot, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;

    return {
      x: pivot.x + dx * cos - dy * sin,
      y: pivot.y + dx * sin + dy * cos,
    };
  }

  function wrapAngle(angle) {
    let wrapped = angle;
    while (wrapped > Math.PI) wrapped -= TAU;
    while (wrapped < -Math.PI) wrapped += TAU;
    return wrapped;
  }

  function makeRng(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function presetLabel(value) {
    const labels = {
      precision: 'Precision Rig',
      gantry: 'Industrial Gantry',
      tentacle: 'Tentacle Array',
      inspection: 'Inspection Arms',
    };
    return labels[value] || value;
  }

  function solverLabel(value) {
    return value === 'ccd' ? 'CCD' : 'FABRIK';
  }

  function targetLabel(value) {
    const labels = {
      pointer: 'Pointer Target',
      orbit: 'Auto Orbit',
      scan: 'Figure Eight',
    };
    return labels[value] || value;
  }

  function buildRootConfigs(preset, width, height) {
    if (preset === 'gantry') {
      return [
        { x: width * 0.18, y: height * 0.30, angle: 0.12, color: '#6ee7d8' },
        { x: width * 0.18, y: height * 0.70, angle: -0.12, color: '#f8dc4a' },
      ];
    }

    if (preset === 'tentacle') {
      return [
        { x: width * 0.22, y: height * 0.86, angle: -0.92, color: '#78e6c7' },
        { x: width * 0.38, y: height * 0.90, angle: -1.24, color: '#79b8ff' },
        { x: width * 0.54, y: height * 0.90, angle: -1.55, color: '#f8dc4a' },
        { x: width * 0.70, y: height * 0.86, angle: -2.10, color: '#ff7e90' },
      ];
    }

    if (preset === 'inspection') {
      return [
        { x: width * 0.10, y: height * 0.18, angle: 0.54, color: '#6ee7d8' },
        { x: width * 0.10, y: height * 0.82, angle: -0.54, color: '#f8dc4a' },
        { x: width * 0.90, y: height * 0.18, angle: 2.60, color: '#79b8ff' },
        { x: width * 0.90, y: height * 0.82, angle: -2.60, color: '#ff7e90' },
      ];
    }

    return [
      { x: width * 0.14, y: height * 0.50, angle: 0.00, color: '#6ee7d8' },
      { x: width * 0.50, y: height * 0.86, angle: -1.45, color: '#f8dc4a' },
      { x: width * 0.86, y: height * 0.50, angle: Math.PI, color: '#ff7e90' },
    ];
  }

  function createChain(config, segmentCount, segmentLength, jitter) {
    const lengths = [];
    const points = [{ x: config.x, y: config.y }];
    let angle = config.angle;

    for (let index = 0; index < segmentCount; index += 1) {
      const length = segmentLength * lerp(0.86, 1.14, jitter());
      angle += (jitter() - 0.5) * 0.16;
      lengths.push(length);
      points.push({
        x: points[index].x + Math.cos(angle) * length,
        y: points[index].y + Math.sin(angle) * length,
      });
    }

    return {
      root: { x: config.x, y: config.y },
      color: config.color,
      lengths,
      points,
      lastError: 0,
      iterations: 0,
      collisions: 0,
      reachRatio: 0,
    };
  }

  function createObstacles(preset, width, height) {
    if (preset === 'gantry') {
      return [
        { x: width * 0.43, y: height * 0.30, r: Math.min(width, height) * 0.075 },
        { x: width * 0.47, y: height * 0.70, r: Math.min(width, height) * 0.090 },
        { x: width * 0.67, y: height * 0.50, r: Math.min(width, height) * 0.075 },
      ];
    }

    if (preset === 'tentacle') {
      return [
        { x: width * 0.30, y: height * 0.54, r: Math.min(width, height) * 0.070 },
        { x: width * 0.52, y: height * 0.46, r: Math.min(width, height) * 0.085 },
        { x: width * 0.73, y: height * 0.55, r: Math.min(width, height) * 0.065 },
      ];
    }

    if (preset === 'inspection') {
      return [
        { x: width * 0.50, y: height * 0.50, r: Math.min(width, height) * 0.115 },
        { x: width * 0.50, y: height * 0.23, r: Math.min(width, height) * 0.060 },
        { x: width * 0.50, y: height * 0.77, r: Math.min(width, height) * 0.060 },
      ];
    }

    return [
      { x: width * 0.42, y: height * 0.42, r: Math.min(width, height) * 0.080 },
      { x: width * 0.58, y: height * 0.58, r: Math.min(width, height) * 0.080 },
    ];
  }

  function createScene(options) {
    const rng = makeRng(options.seed || 1);
    const rootConfigs = buildRootConfigs(options.preset, options.width, options.height);
    const chains = rootConfigs.map((config) => (
      createChain(config, options.segmentCount, options.segmentLength, rng)
    ));

    return {
      chains,
      obstacles: createObstacles(options.preset, options.width, options.height),
      seed: options.seed || 1,
    };
  }

  function applyJointLimits(points, lengths, maxAngle) {
    for (let index = 1; index < points.length - 1; index += 1) {
      const prev = points[index - 1];
      const current = points[index];
      const next = points[index + 1];
      const incoming = Math.atan2(current.y - prev.y, current.x - prev.x);
      const outgoing = Math.atan2(next.y - current.y, next.x - current.x);
      const delta = wrapAngle(outgoing - incoming);

      if (Math.abs(delta) > maxAngle) {
        const clamped = incoming + clamp(delta, -maxAngle, maxAngle);
        points[index + 1] = {
          x: current.x + Math.cos(clamped) * lengths[index],
          y: current.y + Math.sin(clamped) * lengths[index],
        };
      }
    }
  }

  function pushOutsideObstacles(points, obstacles, padding) {
    let collisions = 0;

    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      for (let obstacleIndex = 0; obstacleIndex < obstacles.length; obstacleIndex += 1) {
        const obstacle = obstacles[obstacleIndex];
        const dx = points[pointIndex].x - obstacle.x;
        const dy = points[pointIndex].y - obstacle.y;
        const length = Math.hypot(dx, dy) || 1;
        const minimum = obstacle.r + padding;

        if (length < minimum) {
          collisions += 1;
          points[pointIndex] = {
            x: obstacle.x + (dx / length) * minimum,
            y: obstacle.y + (dy / length) * minimum,
          };
        }
      }
    }

    return collisions;
  }

  function restoreLengths(points, lengths, root) {
    points[0] = clonePoint(root);
    for (let index = 0; index < lengths.length; index += 1) {
      points[index + 1] = pointAlong(points[index], points[index + 1], lengths[index]);
    }
  }

  function solveReachableFABRIK(points, lengths, root, target, settings) {
    let iterations = 0;
    const endIndex = points.length - 1;

    for (let iteration = 0; iteration < settings.maxIterations; iteration += 1) {
      iterations = iteration + 1;
      points[endIndex] = clonePoint(target);

      for (let index = endIndex - 1; index >= 0; index -= 1) {
        points[index] = pointAlong(points[index + 1], points[index], lengths[index]);
      }

      points[0] = clonePoint(root);

      for (let index = 0; index < lengths.length; index += 1) {
        points[index + 1] = pointAlong(points[index], points[index + 1], lengths[index]);
      }

      if (settings.clampJoints) {
        applyJointLimits(points, lengths, settings.maxJointAngle);
        restoreLengths(points, lengths, root);
      }

      if (distance(points[endIndex], target) <= settings.tolerance) {
        break;
      }
    }

    return iterations;
  }

  function solveUnreachable(points, lengths, root, target) {
    const direction = normalize(target.x - root.x, target.y - root.y);
    points[0] = clonePoint(root);

    for (let index = 0; index < lengths.length; index += 1) {
      points[index + 1] = {
        x: points[index].x + direction.x * lengths[index],
        y: points[index].y + direction.y * lengths[index],
      };
    }

    return 1;
  }

  function solveCCD(points, lengths, root, target, settings) {
    let iterations = 0;
    const endIndex = points.length - 1;

    points[0] = clonePoint(root);

    for (let iteration = 0; iteration < settings.maxIterations; iteration += 1) {
      iterations = iteration + 1;

      for (let joint = endIndex - 1; joint >= 0; joint -= 1) {
        const pivot = points[joint];
        const end = points[endIndex];
        const currentAngle = Math.atan2(end.y - pivot.y, end.x - pivot.x);
        const targetAngle = Math.atan2(target.y - pivot.y, target.x - pivot.x);
        let delta = wrapAngle(targetAngle - currentAngle);

        if (settings.clampJoints) {
          delta = clamp(delta, -settings.maxJointAngle * 0.32, settings.maxJointAngle * 0.32);
        }

        for (let tail = joint + 1; tail <= endIndex; tail += 1) {
          points[tail] = rotatePoint(points[tail], pivot, delta);
        }
      }

      restoreLengths(points, lengths, root);

      if (distance(points[endIndex], target) <= settings.tolerance) {
        break;
      }
    }

    return iterations;
  }

  function solveChain(chain, target, settings) {
    const root = chain.root;
    const points = chain.points.map(clonePoint);
    const lengths = chain.lengths;
    const reach = lengths.reduce((sum, length) => sum + length, 0);
    const targetDistance = distance(root, target);
    let iterations = 0;

    if (targetDistance > reach) {
      iterations = solveUnreachable(points, lengths, root, target);
    } else if (settings.solver === 'ccd') {
      iterations = solveCCD(points, lengths, root, target, settings);
    } else {
      iterations = solveReachableFABRIK(points, lengths, root, target, settings);
    }

    let collisions = 0;
    if (settings.avoidObstacles && settings.obstacles.length > 0) {
      for (let pass = 0; pass < 2; pass += 1) {
        collisions += pushOutsideObstacles(points, settings.obstacles, settings.obstaclePadding);
        restoreLengths(points, lengths, root);

        if (settings.clampJoints) {
          applyJointLimits(points, lengths, settings.maxJointAngle);
          restoreLengths(points, lengths, root);
        }
      }
    }

    const lastPoint = points[points.length - 1];

    chain.points = points;
    chain.lastError = distance(lastPoint, target);
    chain.iterations = iterations;
    chain.collisions = collisions;
    chain.reachRatio = clamp(targetDistance / reach, 0, 1);

    return chain;
  }

  function solveScene(chains, target, settings) {
    const nextChains = chains.map((chain) => solveChain(chain, target, settings));
    const totals = nextChains.reduce((summary, chain) => ({
      error: summary.error + chain.lastError,
      iterations: summary.iterations + chain.iterations,
      collisions: summary.collisions + chain.collisions,
      joints: summary.joints + chain.points.length,
      reachRatio: summary.reachRatio + chain.reachRatio,
    }), {
      error: 0,
      iterations: 0,
      collisions: 0,
      joints: 0,
      reachRatio: 0,
    });

    return {
      chains: nextChains,
      metrics: {
        averageError: totals.error / Math.max(1, nextChains.length),
        iterations: totals.iterations,
        collisions: totals.collisions,
        joints: totals.joints,
        averageReachRatio: totals.reachRatio / Math.max(1, nextChains.length),
      },
    };
  }

  window.IKCore = {
    TAU,
    clamp,
    createScene,
    distance,
    presetLabel,
    solveScene,
    solverLabel,
    targetLabel,
  };
}());
