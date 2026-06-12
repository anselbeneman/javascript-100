(function attachMeshCore(global) {
  const EPSILON = 1e-9;

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

  function createPoints(options = {}) {
    const count = clamp(Math.round(options.count || 54), 6, 220);
    const spread = clamp(Number(options.spread || 0.84), 0.4, 1);
    const jitter = clamp(Number(options.jitter || 0.24), 0, 0.75);
    const rng = makeRng(options.seed || 13);
    const points = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < count; index += 1) {
      const layer = (index + 0.5) / count;
      const radius = Math.sqrt(layer) * 0.47 * spread;
      const angle = index * goldenAngle + (rng() - 0.5) * jitter;
      const wobble = 1 + (rng() - 0.5) * jitter * 0.62;
      const x = 0.5 + Math.cos(angle) * radius * wobble;
      const y = 0.5 + Math.sin(angle) * radius * wobble;

      points.push({
        id: index,
        x: clamp(x, 0.035, 0.965),
        y: clamp(y, 0.035, 0.965),
      });
    }

    return points;
  }

  function signedArea(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  function triangleArea(a, b, c) {
    return Math.abs(signedArea(a, b, c)) * 0.5;
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function circumcircle(a, b, c) {
    const d = 2 * (
      a.x * (b.y - c.y) +
      b.x * (c.y - a.y) +
      c.x * (a.y - b.y)
    );

    if (Math.abs(d) < EPSILON) {
      return {
        x: (a.x + b.x + c.x) / 3,
        y: (a.y + b.y + c.y) / 3,
        radiusSquared: Number.POSITIVE_INFINITY,
      };
    }

    const aa = a.x * a.x + a.y * a.y;
    const bb = b.x * b.x + b.y * b.y;
    const cc = c.x * c.x + c.y * c.y;
    const x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d;
    const y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;

    return {
      x,
      y,
      radiusSquared: distanceSquared({ x, y }, a),
    };
  }

  function edgeKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  function orientedTriangle(points, a, b, c) {
    if (signedArea(points[a], points[b], points[c]) < 0) {
      return { a, b: c, c: b };
    }

    return { a, b, c };
  }

  function createSuperTriangle(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const dx = maxX - minX;
    const dy = maxY - minY;
    const delta = Math.max(dx, dy, 1);
    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;

    return [
      { id: points.length, x: midX - 18 * delta, y: midY - delta },
      { id: points.length + 1, x: midX, y: midY + 18 * delta },
      { id: points.length + 2, x: midX + 18 * delta, y: midY - delta },
    ];
  }

  function triangulate(points) {
    if (!Array.isArray(points) || points.length < 3) {
      return [];
    }

    const baseCount = points.length;
    const allPoints = points.concat(createSuperTriangle(points));
    let triangles = [orientedTriangle(allPoints, baseCount, baseCount + 1, baseCount + 2)];

    for (let pointIndex = 0; pointIndex < baseCount; pointIndex += 1) {
      const point = allPoints[pointIndex];
      const badTriangles = [];
      const boundary = new Map();

      triangles.forEach((triangle, triangleIndex) => {
        const circle = circumcircle(allPoints[triangle.a], allPoints[triangle.b], allPoints[triangle.c]);
        const inside = distanceSquared(point, circle) <= circle.radiusSquared + EPSILON;

        if (inside) {
          badTriangles.push(triangleIndex);
          [
            [triangle.a, triangle.b],
            [triangle.b, triangle.c],
            [triangle.c, triangle.a],
          ].forEach(([a, b]) => {
            const key = edgeKey(a, b);
            if (boundary.has(key)) {
              boundary.delete(key);
            } else {
              boundary.set(key, { a, b });
            }
          });
        }
      });

      const badSet = new Set(badTriangles);
      triangles = triangles.filter((_, triangleIndex) => !badSet.has(triangleIndex));

      boundary.forEach((edge) => {
        triangles.push(orientedTriangle(allPoints, edge.a, edge.b, pointIndex));
      });
    }

    return triangles
      .filter((triangle) => triangle.a < baseCount && triangle.b < baseCount && triangle.c < baseCount)
      .filter((triangle) => triangleArea(points[triangle.a], points[triangle.b], points[triangle.c]) > EPSILON);
  }

  function angleDegrees(a, b, c) {
    const ab = Math.sqrt(distanceSquared(a, b));
    const bc = Math.sqrt(distanceSquared(b, c));
    const ac = Math.sqrt(distanceSquared(a, c));

    if (ab < EPSILON || bc < EPSILON) return 0;

    const cosine = clamp((ab * ab + bc * bc - ac * ac) / (2 * ab * bc), -1, 1);
    return Math.acos(cosine) * 180 / Math.PI;
  }

  function meshStats(points, triangles) {
    const edges = new Set();
    let area = 0;
    let minAngle = Infinity;
    let maxRadius = 0;

    triangles.forEach((triangle) => {
      const a = points[triangle.a];
      const b = points[triangle.b];
      const c = points[triangle.c];
      area += triangleArea(a, b, c);
      edges.add(edgeKey(triangle.a, triangle.b));
      edges.add(edgeKey(triangle.b, triangle.c));
      edges.add(edgeKey(triangle.c, triangle.a));

      minAngle = Math.min(
        minAngle,
        angleDegrees(c, a, b),
        angleDegrees(a, b, c),
        angleDegrees(b, c, a),
      );

      const circle = circumcircle(a, b, c);
      if (Number.isFinite(circle.radiusSquared)) {
        maxRadius = Math.max(maxRadius, Math.sqrt(circle.radiusSquared));
      }
    });

    return {
      pointCount: points.length,
      triangleCount: triangles.length,
      edgeCount: edges.size,
      averageArea: triangles.length ? area / triangles.length : 0,
      coverageArea: area,
      minAngle: Number.isFinite(minAngle) ? minAngle : 0,
      maxCircumradius: maxRadius,
      eulerResidual: points.length - edges.size + triangles.length,
    };
  }

  function createMesh(options = {}) {
    const points = createPoints(options);
    const triangles = triangulate(points);
    return {
      points,
      triangles,
      stats: meshStats(points, triangles),
    };
  }

  function benchmarkMesh(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 20), 1, 160);
    const started = Date.now();
    let mesh = null;

    for (let index = 0; index < iterations; index += 1) {
      mesh = createMesh({
        ...options,
        seed: (options.seed || 13) + index,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastStats: mesh ? mesh.stats : null,
    };
  }

  const api = {
    benchmarkMesh,
    circumcircle,
    createMesh,
    createPoints,
    edgeKey,
    makeRng,
    meshStats,
    triangulate,
  };

  global.MeshCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
