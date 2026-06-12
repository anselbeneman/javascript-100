(function () {
  'use strict';

  const presets = {
    fern: {
      axiom: 'X',
      rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
      angle: 25,
      step: 6,
      heading: -90,
    },
    bush: {
      axiom: 'F',
      rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
      angle: 22.5,
      step: 5,
      heading: -90,
    },
    crystal: {
      axiom: 'F+F+F+F',
      rules: { F: 'FF+F++F+F' },
      angle: 90,
      step: 4.2,
      heading: 0,
    },
  };

  function rewrite(axiom, rules, iterations) {
    let sentence = axiom;
    const history = [sentence.length];

    for (let step = 0; step < iterations; step += 1) {
      let next = '';
      for (let index = 0; index < sentence.length; index += 1) {
        const token = sentence[index];
        next += rules[token] || token;
      }
      sentence = next;
      history.push(sentence.length);
    }

    return { sentence, history };
  }

  function buildSegments(sentence, options) {
    const angleStep = options.angle * Math.PI / 180;
    const stack = [];
    const segments = [];
    let x = 0;
    let y = 0;
    let heading = options.heading * Math.PI / 180;
    let maxDepth = 0;
    let branchCount = 0;

    for (let index = 0; index < sentence.length; index += 1) {
      const token = sentence[index];

      if (token === 'F' || token === 'G') {
        const nx = x + Math.cos(heading) * options.step;
        const ny = y + Math.sin(heading) * options.step;
        segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth: stack.length });
        x = nx;
        y = ny;
      } else if (token === '+') {
        heading += angleStep;
      } else if (token === '-') {
        heading -= angleStep;
      } else if (token === '[') {
        stack.push({ x, y, heading });
        branchCount += 1;
        maxDepth = Math.max(maxDepth, stack.length);
      } else if (token === ']' && stack.length > 0) {
        const state = stack.pop();
        x = state.x;
        y = state.y;
        heading = state.heading;
      }
    }

    return { segments, branchCount, maxDepth };
  }

  function measureBounds(segments) {
    const bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    segments.forEach((segment) => {
      bounds.minX = Math.min(bounds.minX, segment.x1, segment.x2);
      bounds.minY = Math.min(bounds.minY, segment.y1, segment.y2);
      bounds.maxX = Math.max(bounds.maxX, segment.x1, segment.x2);
      bounds.maxY = Math.max(bounds.maxY, segment.y1, segment.y2);
    });

    return {
      ...bounds,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    };
  }

  function analyze(options = {}) {
    const presetName = options.preset || 'fern';
    const preset = presets[presetName] || presets.fern;
    const iterations = Math.max(0, Math.min(6, Math.floor(options.iterations ?? 4)));
    const angle = Number.isFinite(options.angle) ? options.angle : preset.angle;
    const step = Number.isFinite(options.step) ? options.step : preset.step;
    const rewritten = rewrite(preset.axiom, preset.rules, iterations);
    const geometry = buildSegments(rewritten.sentence, {
      angle,
      step,
      heading: preset.heading,
    });
    const bounds = measureBounds(geometry.segments);

    return {
      preset: presetName,
      sentence: rewritten.sentence,
      history: rewritten.history,
      segments: geometry.segments,
      metrics: {
        iterations,
        symbols: rewritten.sentence.length,
        segments: geometry.segments.length,
        branches: geometry.branchCount,
        maxDepth: geometry.maxDepth,
        width: bounds.width,
        height: bounds.height,
      },
      bounds,
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(80, Math.floor(options.runs || 20)));
    const started = performance.now();
    let last = null;

    for (let index = 0; index < runs; index += 1) {
      last = analyze({
        preset: options.preset || 'fern',
        iterations: options.iterations ?? 4,
        angle: options.angle,
      });
    }

    return {
      runs,
      avgMs: (performance.now() - started) / runs,
      segments: last.metrics.segments,
      symbols: last.metrics.symbols,
    };
  }

  window.LSystemCore = {
    analyze,
    benchmark,
    buildSegments,
    measureBounds,
    presets,
    rewrite,
  };
}());
