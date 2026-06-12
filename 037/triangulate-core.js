(function () {
  'use strict';

  function makePolygon(options = {}) {
    const count = Math.max(5, Math.min(32, Math.floor(options.count || 15)));
    const notch = Number.isFinite(options.notch) ? options.notch : 0.58;
    const phase = Number.isFinite(options.phase) ? options.phase : -0.2;
    return Array.from({ length: count }, (_, index) => {
      const angle = phase + index / count * Math.PI * 2;
      const radius = index % 3 === 1 ? notch : 0.92 + Math.sin(index * 1.7) * 0.05;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }

  function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      area += a.x * b.y - b.x * a.y;
    }
    return area * 0.5;
  }

  function area(points) {
    return Math.abs(signedArea(points));
  }

  function orient(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  function pointInTriangle(p, a, b, c) {
    const ab = orient(a, b, p);
    const bc = orient(b, c, p);
    const ca = orient(c, a, p);
    return ab >= -1e-9 && bc >= -1e-9 && ca >= -1e-9;
  }

  function triangulate(input) {
    const points = signedArea(input) < 0 ? input.slice().reverse() : input.slice();
    const indices = points.map((_, index) => index);
    const triangles = [];
    let guards = 0;

    while (indices.length > 3 && guards < points.length * points.length) {
      let clipped = false;
      for (let cursor = 0; cursor < indices.length; cursor += 1) {
        const previousIndex = indices[(cursor - 1 + indices.length) % indices.length];
        const currentIndex = indices[cursor];
        const nextIndex = indices[(cursor + 1) % indices.length];
        const a = points[previousIndex];
        const b = points[currentIndex];
        const c = points[nextIndex];

        if (orient(a, b, c) <= 1e-9) continue;

        const containsPoint = indices.some((candidate) => (
          candidate !== previousIndex
          && candidate !== currentIndex
          && candidate !== nextIndex
          && pointInTriangle(points[candidate], a, b, c)
        ));

        if (!containsPoint) {
          triangles.push([a, b, c]);
          indices.splice(cursor, 1);
          clipped = true;
          break;
        }
      }

      if (!clipped) break;
      guards += 1;
    }

    if (indices.length === 3) {
      triangles.push(indices.map((index) => points[index]));
    }

    return { points, triangles, guards };
  }

  function analyze(options = {}) {
    const polygon = makePolygon(options);
    const result = triangulate(polygon);
    const polygonArea = area(result.points);
    const triangleArea = result.triangles.reduce((sum, triangle) => sum + area(triangle), 0);
    return {
      polygon: result.points,
      triangles: result.triangles,
      metrics: {
        vertices: result.points.length,
        triangles: result.triangles.length,
        expectedTriangles: result.points.length - 2,
        polygonArea,
        triangleArea,
        areaError: Math.abs(polygonArea - triangleArea),
        guards: result.guards,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let triangles = 0;
    let error = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, phase: index * 0.04 });
      triangles += result.metrics.triangles;
      error += result.metrics.areaError;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgTriangles: triangles / runs, avgAreaError: error / runs };
  }

  window.TriangulateCore = {
    analyze,
    area,
    benchmark,
    makePolygon,
    orient,
    pointInTriangle,
    signedArea,
    triangulate,
  };
}());
