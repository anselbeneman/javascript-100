(function () {
  'use strict';

  function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      area += a.x * b.y - b.x * a.y;
    }
    return Math.abs(area) * 0.5;
  }

  function makeSubject(options = {}) {
    const points = Math.max(5, Math.min(18, Math.floor(options.points || 11)));
    const inner = Number.isFinite(options.inner) ? options.inner : 0.44;
    const phase = Number.isFinite(options.phase) ? options.phase : -0.3;
    const polygon = [];
    for (let index = 0; index < points; index += 1) {
      const angle = phase + index / points * Math.PI * 2;
      const radius = index % 2 === 0 ? 0.92 : inner;
      polygon.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return polygon;
  }

  function makeClipWindow(type = 'box', scale = 0.68) {
    if (type === 'diamond') {
      return [
        { x: 0, y: -scale },
        { x: scale, y: 0 },
        { x: 0, y: scale },
        { x: -scale, y: 0 },
      ];
    }

    if (type === 'hexagon') {
      return Array.from({ length: 6 }, (_, index) => {
        const angle = Math.PI / 6 + index / 6 * Math.PI * 2;
        return { x: Math.cos(angle) * scale, y: Math.sin(angle) * scale };
      });
    }

    return [
      { x: -scale, y: -scale },
      { x: scale, y: -scale },
      { x: scale, y: scale },
      { x: -scale, y: scale },
    ];
  }

  function isInside(point, edgeStart, edgeEnd) {
    return (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y)
      - (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x) >= -1e-9;
  }

  function intersection(a, b, edgeStart, edgeEnd) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const ex = edgeEnd.x - edgeStart.x;
    const ey = edgeEnd.y - edgeStart.y;
    const denominator = dx * ey - dy * ex;

    if (Math.abs(denominator) < 1e-9) {
      return { x: b.x, y: b.y };
    }

    const t = ((edgeStart.x - a.x) * ey - (edgeStart.y - a.y) * ex) / denominator;
    return {
      x: a.x + dx * t,
      y: a.y + dy * t,
    };
  }

  function clipAgainstEdge(subject, edgeStart, edgeEnd) {
    const output = [];
    if (subject.length === 0) return output;
    let previous = subject[subject.length - 1];
    let previousInside = isInside(previous, edgeStart, edgeEnd);

    subject.forEach((current) => {
      const currentInside = isInside(current, edgeStart, edgeEnd);
      if (currentInside) {
        if (!previousInside) output.push(intersection(previous, current, edgeStart, edgeEnd));
        output.push(current);
      } else if (previousInside) {
        output.push(intersection(previous, current, edgeStart, edgeEnd));
      }
      previous = current;
      previousInside = currentInside;
    });

    return output;
  }

  function clipPolygon(subject, clipWindow) {
    return clipWindow.reduce((polygon, edgeStart, index) => (
      clipAgainstEdge(polygon, edgeStart, clipWindow[(index + 1) % clipWindow.length])
    ), subject);
  }

  function analyze(options = {}) {
    const subject = makeSubject(options);
    const clipWindow = makeClipWindow(options.window || 'box', Number.isFinite(options.scale) ? options.scale : 0.68);
    const clipped = clipPolygon(subject, clipWindow);
    const originalArea = polygonArea(subject);
    const clippedArea = polygonArea(clipped);

    return {
      subject,
      clipWindow,
      clipped,
      metrics: {
        subjectVertices: subject.length,
        clipVertices: clipWindow.length,
        clippedVertices: clipped.length,
        originalArea,
        clippedArea,
        retainedRatio: originalArea > 0 ? clippedArea / originalArea : 0,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(120, Math.floor(options.runs || 30)));
    const started = performance.now();
    let last = null;
    for (let index = 0; index < runs; index += 1) {
      last = analyze({ ...options, phase: index * 0.037 });
    }
    return { runs, avgMs: (performance.now() - started) / runs, clippedVertices: last.metrics.clippedVertices, retainedRatio: last.metrics.retainedRatio };
  }

  window.ClipCore = {
    analyze,
    benchmark,
    clipAgainstEdge,
    clipPolygon,
    intersection,
    isInside,
    makeClipWindow,
    makeSubject,
    polygonArea,
  };
}());
