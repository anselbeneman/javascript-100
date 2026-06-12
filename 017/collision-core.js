(function attachCollisionCore(global) {
  const TAU = Math.PI * 2;

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

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function length(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  function normalize(vector) {
    const value = length(vector) || 1;
    return { x: vector.x / value, y: vector.y / value };
  }

  function regularPolygon(sides, radius) {
    const vertices = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = TAU * index / sides - Math.PI / 2;
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return vertices;
  }

  function createBody(options) {
    const sides = clamp(Math.round(options.sides || 5), 3, 9);
    const radius = Number(options.radius || 0.08);
    return {
      id: options.id || `body-${sides}`,
      position: {
        x: Number(options.x || 0.5),
        y: Number(options.y || 0.5),
      },
      velocity: {
        x: Number(options.vx || 0),
        y: Number(options.vy || 0),
      },
      angle: Number(options.angle || 0),
      angularVelocity: Number(options.angularVelocity || 0),
      radius,
      mass: Number(options.mass || 1),
      vertices: regularPolygon(sides, radius),
      color: options.color || '#78f8d3',
    };
  }

  function transformedVertices(body) {
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);

    return body.vertices.map((vertex) => ({
      x: body.position.x + vertex.x * cos - vertex.y * sin,
      y: body.position.y + vertex.x * sin + vertex.y * cos,
    }));
  }

  function edgeAxes(vertices) {
    const axes = [];
    for (let index = 0; index < vertices.length; index += 1) {
      const current = vertices[index];
      const next = vertices[(index + 1) % vertices.length];
      const edge = { x: next.x - current.x, y: next.y - current.y };
      axes.push(normalize({ x: -edge.y, y: edge.x }));
    }
    return axes;
  }

  function project(vertices, axis) {
    let min = Infinity;
    let max = -Infinity;
    vertices.forEach((vertex) => {
      const value = dot(vertex, axis);
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
    return { min, max };
  }

  function testCollision(bodyA, bodyB) {
    const verticesA = transformedVertices(bodyA);
    const verticesB = transformedVertices(bodyB);
    const axes = edgeAxes(verticesA).concat(edgeAxes(verticesB));
    let minOverlap = Infinity;
    let bestAxis = null;

    for (let index = 0; index < axes.length; index += 1) {
      const axis = axes[index];
      const projectionA = project(verticesA, axis);
      const projectionB = project(verticesB, axis);
      const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

      if (overlap <= 0) {
        return {
          colliding: false,
          penetration: 0,
          normal: { x: 0, y: 0 },
          verticesA,
          verticesB,
        };
      }

      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxis = axis;
      }
    }

    const centerDelta = {
      x: bodyB.position.x - bodyA.position.x,
      y: bodyB.position.y - bodyA.position.y,
    };

    if (dot(centerDelta, bestAxis) < 0) {
      bestAxis = { x: -bestAxis.x, y: -bestAxis.y };
    }

    return {
      colliding: true,
      penetration: minOverlap,
      normal: bestAxis,
      verticesA,
      verticesB,
      contact: {
        x: (bodyA.position.x + bodyB.position.x) * 0.5,
        y: (bodyA.position.y + bodyB.position.y) * 0.5,
      },
    };
  }

  function resolveCollision(bodyA, bodyB, collision, restitution = 0.64) {
    if (!collision.colliding) return;

    const invMassA = bodyA.mass > 0 ? 1 / bodyA.mass : 0;
    const invMassB = bodyB.mass > 0 ? 1 / bodyB.mass : 0;
    const invMassSum = invMassA + invMassB || 1;
    const correction = collision.penetration / invMassSum;

    bodyA.position.x -= collision.normal.x * correction * invMassA * 0.82;
    bodyA.position.y -= collision.normal.y * correction * invMassA * 0.82;
    bodyB.position.x += collision.normal.x * correction * invMassB * 0.82;
    bodyB.position.y += collision.normal.y * correction * invMassB * 0.82;

    const relativeVelocity = {
      x: bodyB.velocity.x - bodyA.velocity.x,
      y: bodyB.velocity.y - bodyA.velocity.y,
    };
    const velocityAlongNormal = dot(relativeVelocity, collision.normal);

    if (velocityAlongNormal > 0) return;

    const impulse = -(1 + restitution) * velocityAlongNormal / invMassSum;
    bodyA.velocity.x -= impulse * invMassA * collision.normal.x;
    bodyA.velocity.y -= impulse * invMassA * collision.normal.y;
    bodyB.velocity.x += impulse * invMassB * collision.normal.x;
    bodyB.velocity.y += impulse * invMassB * collision.normal.y;
  }

  function createScene(options = {}) {
    const random = makeRng(options.seed || 17);
    const count = clamp(Math.round(options.count || 7), 3, 18);
    const bodies = [];

    for (let index = 0; index < count; index += 1) {
      const angle = TAU * index / count;
      const radius = 0.05 + random() * 0.035;
      const ring = 0.18 + random() * 0.12;
      const inward = 0.13 + random() * 0.08;
      const tangent = (random() - 0.5) * 0.05;

      bodies.push(createBody({
        id: `poly-${index}`,
        sides: 3 + (index % 5),
        radius,
        x: 0.5 + Math.cos(angle) * ring,
        y: 0.5 + Math.sin(angle) * ring,
        vx: -Math.cos(angle) * inward - Math.sin(angle) * tangent,
        vy: -Math.sin(angle) * inward + Math.cos(angle) * tangent,
        angle: random() * TAU,
        angularVelocity: (random() - 0.5) * 1.5,
        mass: 0.7 + radius * 8,
        color: index % 3 === 0 ? '#78f8d3' : index % 3 === 1 ? '#ffde43' : '#ff7890',
      }));
    }

    bodies.push(createBody({
      id: 'center-anchor',
      sides: 6,
      radius: 0.105,
      x: 0.5,
      y: 0.5,
      vx: 0,
      vy: 0,
      mass: 2.4,
      color: '#a8c7ff',
    }));

    return {
      bodies,
      contacts: [],
      time: 0,
      steps: 0,
      bounds: { min: 0.06, max: 0.94 },
    };
  }

  function kineticEnergy(bodies) {
    return bodies.reduce((sum, body) => {
      const speedSquared = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y;
      return sum + 0.5 * body.mass * speedSquared;
    }, 0);
  }

  function stepScene(scene, options = {}) {
    const dt = Number(options.dt || 1 / 60);
    const restitution = Number(options.restitution || 0.64);
    const contacts = [];

    scene.bodies.forEach((body) => {
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.angle += body.angularVelocity * dt;

      if (body.position.x - body.radius < scene.bounds.min || body.position.x + body.radius > scene.bounds.max) {
        body.velocity.x *= -restitution;
        body.position.x = clamp(body.position.x, scene.bounds.min + body.radius, scene.bounds.max - body.radius);
      }

      if (body.position.y - body.radius < scene.bounds.min || body.position.y + body.radius > scene.bounds.max) {
        body.velocity.y *= -restitution;
        body.position.y = clamp(body.position.y, scene.bounds.min + body.radius, scene.bounds.max - body.radius);
      }
    });

    for (let a = 0; a < scene.bodies.length; a += 1) {
      for (let b = a + 1; b < scene.bodies.length; b += 1) {
        const collision = testCollision(scene.bodies[a], scene.bodies[b]);
        if (collision.colliding) {
          resolveCollision(scene.bodies[a], scene.bodies[b], collision, restitution);
          contacts.push({
            a,
            b,
            normal: collision.normal,
            penetration: collision.penetration,
            contact: collision.contact,
          });
        }
      }
    }

    scene.contacts = contacts;
    scene.time += dt;
    scene.steps += 1;

    return {
      contacts,
      energy: kineticEnergy(scene.bodies),
      pairCount: scene.bodies.length * (scene.bodies.length - 1) / 2,
    };
  }

  function summarize(options = {}) {
    const scene = createScene(options);
    const frames = clamp(Math.round(options.frames || 120), 1, 600);
    let maxContacts = 0;
    let maxPenetration = 0;
    let totalContacts = 0;
    let last = null;

    for (let frame = 0; frame < frames; frame += 1) {
      last = stepScene(scene, options);
      maxContacts = Math.max(maxContacts, last.contacts.length);
      totalContacts += last.contacts.length;
      last.contacts.forEach((contact) => {
        maxPenetration = Math.max(maxPenetration, contact.penetration);
      });
    }

    return {
      scene,
      metrics: {
        bodies: scene.bodies.length,
        steps: scene.steps,
        pairCount: last ? last.pairCount : 0,
        currentContacts: scene.contacts.length,
        maxContacts,
        averageContacts: totalContacts / frames,
        maxPenetration,
        energy: kineticEnergy(scene.bodies),
      },
    };
  }

  function benchmarkCollision(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 20), 1, 120);
    const started = Date.now();
    let summary = null;

    for (let index = 0; index < iterations; index += 1) {
      summary = summarize({
        ...options,
        seed: (options.seed || 17) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: summary ? summary.metrics : null,
    };
  }

  const api = {
    benchmarkCollision,
    createBody,
    createScene,
    kineticEnergy,
    makeRng,
    project,
    resolveCollision,
    stepScene,
    summarize,
    testCollision,
    transformedVertices,
  };

  global.CollisionCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
