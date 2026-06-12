(function () {
  'use strict';

  const cases = {
    1: [[3, 0]],
    2: [[0, 1]],
    3: [[3, 1]],
    4: [[1, 2]],
    5: [[3, 2], [0, 1]],
    6: [[0, 2]],
    7: [[3, 2]],
    8: [[2, 3]],
    9: [[0, 2]],
    10: [[0, 3], [1, 2]],
    11: [[1, 2]],
    12: [[1, 3]],
    13: [[0, 1]],
    14: [[3, 0]],
  };

  function fieldValue(x, y, options) {
    const nx = x / Math.max(1, options.cols - 1);
    const ny = y / Math.max(1, options.rows - 1);
    const wave = Math.sin((nx * 7.2 + options.phase) * Math.PI) * 0.34
      + Math.cos((ny * 5.4 - options.phase * 0.7) * Math.PI) * 0.28;
    const cx = nx - 0.52;
    const cy = ny - 0.48;
    const island = Math.exp(-(cx * cx + cy * cy) * 9.5);
    const ridge = Math.exp(-Math.abs(Math.sin((nx + ny + options.phase * 0.2) * Math.PI * 2.5)) * 2.7) * 0.18;
    return wave + island + ridge - 0.42;
  }

  function buildField(options = {}) {
    const cols = Math.max(12, Math.min(96, Math.floor(options.cols || 56)));
    const rows = Math.max(12, Math.min(72, Math.floor(options.rows || 36)));
    const phase = Number.isFinite(options.phase) ? options.phase : 0.18;
    const values = Array.from({ length: rows }, (_, y) => (
      Array.from({ length: cols }, (_, x) => fieldValue(x, y, { cols, rows, phase }))
    ));
    return { cols, rows, values, phase };
  }

  function interpolate(a, b, threshold) {
    const span = b.value - a.value;
    const t = Math.abs(span) < 1e-9 ? 0.5 : (threshold - a.value) / span;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  function edgePoint(edge, cell, threshold) {
    const { x, y, tl, tr, br, bl } = cell;
    if (edge === 0) return interpolate({ x, y, value: tl }, { x: x + 1, y, value: tr }, threshold);
    if (edge === 1) return interpolate({ x: x + 1, y, value: tr }, { x: x + 1, y: y + 1, value: br }, threshold);
    if (edge === 2) return interpolate({ x: x + 1, y: y + 1, value: br }, { x, y: y + 1, value: bl }, threshold);
    return interpolate({ x, y: y + 1, value: bl }, { x, y, value: tl }, threshold);
  }

  function extractContours(field, threshold = 0) {
    const segments = [];
    let ambiguous = 0;

    for (let y = 0; y < field.rows - 1; y += 1) {
      for (let x = 0; x < field.cols - 1; x += 1) {
        const tl = field.values[y][x];
        const tr = field.values[y][x + 1];
        const br = field.values[y + 1][x + 1];
        const bl = field.values[y + 1][x];
        const mask = (tl >= threshold ? 1 : 0)
          | (tr >= threshold ? 2 : 0)
          | (br >= threshold ? 4 : 0)
          | (bl >= threshold ? 8 : 0);
        const pairs = cases[mask] || [];
        if (mask === 5 || mask === 10) ambiguous += 1;

        pairs.forEach(([a, b]) => {
          const cell = { x, y, tl, tr, br, bl };
          const p1 = edgePoint(a, cell, threshold);
          const p2 = edgePoint(b, cell, threshold);
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        });
      }
    }

    return { segments, ambiguous };
  }

  function analyze(options = {}) {
    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0;
    const field = buildField(options);
    const contours = extractContours(field, threshold);
    const values = field.values.flat();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const active = values.filter((value) => value >= threshold).length;

    return {
      ...field,
      threshold,
      segments: contours.segments,
      metrics: {
        cells: (field.cols - 1) * (field.rows - 1),
        segments: contours.segments.length,
        ambiguous: contours.ambiguous,
        min,
        max,
        activeRatio: active / values.length,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let last = null;
    for (let index = 0; index < runs; index += 1) {
      last = analyze({ ...options, phase: (options.phase || 0.18) + index * 0.01 });
    }
    return { runs, avgMs: (performance.now() - started) / runs, segments: last.metrics.segments, ambiguous: last.metrics.ambiguous };
  }

  window.MarchingCore = {
    analyze,
    benchmark,
    buildField,
    extractContours,
    fieldValue,
    interpolate,
  };
}());
