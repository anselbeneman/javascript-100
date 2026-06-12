(function () {
  'use strict';

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function createSamples(options = {}) {
    const count = Math.max(60, Math.min(900, Math.floor(options.count || 360)));
    const random = mulberry32(options.seed || 35);
    const palette = [
      [245, 88, 92],
      [68, 180, 255],
      [244, 210, 64],
      [92, 220, 145],
      [180, 112, 255],
    ];
    return Array.from({ length: count }, (_, index) => {
      const center = palette[index % palette.length];
      const spread = 26 + (index % 3) * 8;
      return {
        r: clamp(center[0] + (random() - 0.5) * spread * 2),
        g: clamp(center[1] + (random() - 0.5) * spread * 2),
        b: clamp(center[2] + (random() - 0.5) * spread * 2),
      };
    });
  }

  function distanceSq(a, b) {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
  }

  function initialize(samples, k) {
    const step = Math.max(1, Math.floor(samples.length / k));
    return Array.from({ length: k }, (_, index) => ({ ...samples[(index * step + index * 7) % samples.length] }));
  }

  function assign(samples, centroids) {
    let inertia = 0;
    const assignments = samples.map((sample) => {
      let best = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const distance = distanceSq(sample, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      inertia += bestDistance;
      return best;
    });
    return { assignments, inertia };
  }

  function update(samples, assignments, centroids) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    samples.forEach((sample, index) => {
      const bucket = sums[assignments[index]];
      bucket.r += sample.r;
      bucket.g += sample.g;
      bucket.b += sample.b;
      bucket.count += 1;
    });
    return sums.map((sum, index) => (
      sum.count === 0
        ? centroids[index]
        : { r: sum.r / sum.count, g: sum.g / sum.count, b: sum.b / sum.count }
    ));
  }

  function run(options = {}) {
    const samples = options.samples || createSamples(options);
    const k = Math.max(2, Math.min(8, Math.floor(options.k || 5)));
    const iterations = Math.max(1, Math.min(40, Math.floor(options.iterations || 14)));
    let centroids = initialize(samples, k);
    let assignments = [];
    const history = [];

    for (let index = 0; index < iterations; index += 1) {
      const assigned = assign(samples, centroids);
      assignments = assigned.assignments;
      history.push(assigned.inertia);
      centroids = update(samples, assignments, centroids);
    }

    const final = assign(samples, centroids);
    const counts = centroids.map((_, index) => final.assignments.filter((assignment) => assignment === index).length);
    return {
      samples,
      centroids,
      assignments: final.assignments,
      history,
      metrics: {
        samples: samples.length,
        k,
        iterations,
        inertia: final.inertia,
        improvement: history.length > 0 ? (history[0] - final.inertia) / Math.max(1, history[0]) : 0,
        emptyClusters: counts.filter((count) => count === 0).length,
      },
      counts,
    };
  }

  function analyze(options = {}) {
    return run(options);
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(60, Math.floor(options.runs || 16)));
    const started = performance.now();
    let inertia = 0;
    for (let index = 0; index < runs; index += 1) {
      inertia += analyze({ ...options, seed: (options.seed || 35) + index }).metrics.inertia;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgInertia: inertia / runs };
  }

  window.KMeansCore = {
    analyze,
    assign,
    benchmark,
    createSamples,
    distanceSq,
    initialize,
    run,
    update,
  };
}());
