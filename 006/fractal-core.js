(function attachFractalCore(global) {
  'use strict';

  const presets = {
    cardioid: {
      label: 'Cardioid Sweep',
      set: 'mandelbrot',
      centerX: -0.5,
      centerY: 0,
      zoomPower: 0,
      iterations: 240,
      juliaX: -0.72,
      juliaY: 0.24,
    },
    seahorse: {
      label: 'Seahorse Valley',
      set: 'mandelbrot',
      centerX: -0.7435,
      centerY: 0.1314,
      zoomPower: 4.4,
      iterations: 620,
      juliaX: -0.72,
      juliaY: 0.24,
    },
    elephant: {
      label: 'Elephant Valley',
      set: 'mandelbrot',
      centerX: 0.285,
      centerY: 0.01,
      zoomPower: 3.25,
      iterations: 520,
      juliaX: -0.12,
      juliaY: 0.74,
    },
    spiralJulia: {
      label: 'Spiral Julia',
      set: 'julia',
      centerX: 0,
      centerY: 0,
      zoomPower: 0.35,
      iterations: 420,
      juliaX: -0.72,
      juliaY: 0.24,
    },
    dendriteJulia: {
      label: 'Dendrite Julia',
      set: 'julia',
      centerX: 0,
      centerY: 0,
      zoomPower: 0.18,
      iterations: 520,
      juliaX: -0.16,
      juliaY: 0.66,
    },
  };

  const palettes = {
    nebula: [
      [5, 9, 18],
      [44, 99, 156],
      [112, 232, 213],
      [255, 224, 93],
      [255, 116, 104],
    ],
    ember: [
      [8, 5, 4],
      [74, 18, 10],
      [187, 64, 21],
      [255, 170, 54],
      [255, 239, 166],
    ],
    ice: [
      [3, 8, 16],
      [24, 66, 106],
      [84, 172, 196],
      [207, 249, 255],
      [255, 255, 255],
    ],
    mono: [
      [0, 0, 0],
      [54, 62, 70],
      [133, 149, 161],
      [220, 231, 236],
      [255, 255, 255],
    ],
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeConfig(rawConfig) {
    const raw = rawConfig || {};
    const presetId = Object.prototype.hasOwnProperty.call(presets, raw.preset) ? raw.preset : 'cardioid';
    const preset = presets[presetId];
    const set = raw.set === 'julia' || preset.set === 'julia' ? String(raw.set || preset.set) : 'mandelbrot';
    const palette = Object.prototype.hasOwnProperty.call(palettes, raw.palette) ? raw.palette : 'nebula';
    const width = clamp(Math.round(finiteOr(raw.width, 640)), 160, 1600);
    const height = clamp(Math.round(finiteOr(raw.height, 360)), 120, 1200);

    return {
      preset: presetId,
      presetLabel: preset.label,
      set: set === 'julia' ? 'julia' : 'mandelbrot',
      palette,
      width,
      height,
      centerX: finiteOr(raw.centerX, preset.centerX),
      centerY: finiteOr(raw.centerY, preset.centerY),
      zoomPower: clamp(finiteOr(raw.zoomPower, preset.zoomPower), 0, 12),
      iterations: clamp(Math.round(finiteOr(raw.iterations, preset.iterations)), 40, 3000),
      bailout: clamp(finiteOr(raw.bailout, 4), 2, 64),
      juliaX: clamp(finiteOr(raw.juliaX, preset.juliaX), -2, 2),
      juliaY: clamp(finiteOr(raw.juliaY, preset.juliaY), -2, 2),
      smooth: raw.smooth !== false,
    };
  }

  function zoomFromPower(power) {
    return Math.pow(10, power);
  }

  function scaleFor(config) {
    return 3.2 / zoomFromPower(config.zoomPower);
  }

  function pixelToPlane(config, px, py) {
    const scale = scaleFor(config);
    const aspect = config.width / config.height;
    return {
      x: config.centerX + ((px / config.width) - 0.5) * scale * aspect,
      y: config.centerY + ((py / config.height) - 0.5) * scale,
    };
  }

  function colorRamp(palette, t) {
    const colors = palettes[palette] || palettes.nebula;
    const scaled = clamp(t, 0, 0.9999) * (colors.length - 1);
    const index = Math.floor(scaled);
    const local = scaled - index;
    const a = colors[index];
    const b = colors[index + 1] || a;

    return [
      Math.round(a[0] + (b[0] - a[0]) * local),
      Math.round(a[1] + (b[1] - a[1]) * local),
      Math.round(a[2] + (b[2] - a[2]) * local),
    ];
  }

  function sampleFractal(config, planeX, planeY) {
    let zx = config.set === 'julia' ? planeX : 0;
    let zy = config.set === 'julia' ? planeY : 0;
    const cx = config.set === 'julia' ? config.juliaX : planeX;
    const cy = config.set === 'julia' ? config.juliaY : planeY;
    const bailoutSquared = config.bailout * config.bailout;
    let iteration = 0;
    let radiusSquared = 0;

    while (iteration < config.iterations) {
      const zx2 = zx * zx;
      const zy2 = zy * zy;
      radiusSquared = zx2 + zy2;

      if (radiusSquared > bailoutSquared) {
        break;
      }

      zy = 2 * zx * zy + cy;
      zx = zx2 - zy2 + cx;
      iteration += 1;
    }

    if (iteration >= config.iterations) {
      return config.iterations;
    }

    if (!config.smooth || radiusSquared <= 0) {
      return iteration;
    }

    const smooth = iteration + 1 - Math.log(Math.log(Math.sqrt(radiusSquared))) / Math.log(2);
    return Number.isFinite(smooth) ? smooth : iteration;
  }

  function colorFor(config, value) {
    if (value >= config.iterations) {
      return [3, 5, 8];
    }

    const normalized = value / config.iterations;
    const banded = Math.pow(normalized, 0.46);
    return colorRamp(config.palette, banded);
  }

  function createExportPayload(config, metrics) {
    return {
      project: '006 - Fractal Explorer Studio',
      version: 1,
      exportedAt: new Date().toISOString(),
      config,
      metrics,
    };
  }

  function createShareHash(config) {
    const data = {
      p: config.preset,
      s: config.set,
      pa: config.palette,
      x: Number(config.centerX.toFixed(10)),
      y: Number(config.centerY.toFixed(10)),
      z: Number(config.zoomPower.toFixed(4)),
      i: config.iterations,
      b: config.bailout,
      jx: Number(config.juliaX.toFixed(4)),
      jy: Number(config.juliaY.toFixed(4)),
      sm: config.smooth ? 1 : 0,
    };

    return `#${encodeURIComponent(JSON.stringify(data))}`;
  }

  function parseShareHash(hash) {
    if (!hash || hash.length < 3) {
      return null;
    }

    try {
      const data = JSON.parse(decodeURIComponent(hash.slice(1)));
      return normalizeConfig({
        preset: data.p,
        set: data.s,
        palette: data.pa,
        centerX: data.x,
        centerY: data.y,
        zoomPower: data.z,
        iterations: data.i,
        bailout: data.b,
        juliaX: data.jx,
        juliaY: data.jy,
        smooth: data.sm !== 0,
      });
    } catch (error) {
      return null;
    }
  }

  global.FractalCore = Object.freeze({
    presets,
    palettes,
    clamp,
    normalizeConfig,
    zoomFromPower,
    scaleFor,
    pixelToPlane,
    sampleFractal,
    colorFor,
    createExportPayload,
    createShareHash,
    parseShareHash,
  });
}(typeof window !== 'undefined' ? window : globalThis));
