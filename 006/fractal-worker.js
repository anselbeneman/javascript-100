importScripts('fractal-core.js');

self.onmessage = function handleFractalMessage(event) {
  const message = event.data || {};

  if (message.type === 'render') {
    self.postMessage(renderFractal(message.config, message.jobId), []);
  } else if (message.type === 'benchmark') {
    self.postMessage(runBenchmark(message.config, message.frames || 5));
  }
};

function renderFractal(configInput, jobId) {
  const config = self.FractalCore.normalizeConfig(configInput);
  const started = performance.now();
  const pixels = new Uint8ClampedArray(config.width * config.height * 4);
  let escaped = 0;
  let maxSeen = 0;

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const point = self.FractalCore.pixelToPlane(config, x, y);
      const value = self.FractalCore.sampleFractal(config, point.x, point.y);
      const offset = (y * config.width + x) * 4;
      const color = self.FractalCore.colorFor(config, value);

      if (value < config.iterations) {
        escaped += 1;
      }
      maxSeen = Math.max(maxSeen, value);

      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  const renderMs = performance.now() - started;

  return {
    type: 'frame',
    jobId,
    width: config.width,
    height: config.height,
    pixels: pixels.buffer,
    metrics: {
      renderMs,
      pixels: config.width * config.height,
      escaped,
      bounded: config.width * config.height - escaped,
      maxIterationSeen: maxSeen,
    },
  };
}

function runBenchmark(configInput, frames) {
  const config = self.FractalCore.normalizeConfig({
    ...configInput,
    width: 220,
    height: 140,
  });
  const samples = [];

  for (let index = 0; index < frames; index += 1) {
    const result = renderFractal({
      ...config,
      centerX: config.centerX + index * 0.00002,
    }, index);
    samples.push(result.metrics.renderMs);
  }

  samples.sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const percentile = (p) => samples[Math.min(samples.length - 1, Math.floor((samples.length - 1) * p))];

  return {
    type: 'benchmark',
    frames,
    avgMs: total / Math.max(1, samples.length),
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    worstMs: samples[samples.length - 1] || 0,
  };
}
