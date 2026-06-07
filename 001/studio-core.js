(function exposeStudioCore(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.RayStudioCore = api;
}(typeof self !== 'undefined' ? self : globalThis, function createStudioCore() {
  'use strict';

  const TILE_SIZE = 24;
  const DISPLAY_ASPECT_RATIO = 16 / 9;
  const ADAPTIVE_MIN_SAMPLES = 10;
  const ADAPTIVE_VARIANCE_THRESHOLD = 0.00085;
  const QUALITY_PROFILES = {
    preview: {
      label: 'Preview',
      resolution: '384x216',
      bounces: 3,
      samples: 64,
      fov: 36,
      focusDistance: 4.8,
      aperture: 0,
    },
    final: {
      label: 'Final',
      resolution: '800x450',
      bounces: 6,
      samples: 192,
      fov: 36,
      focusDistance: 4.9,
      aperture: 0.025,
    },
    cinematic: {
      label: 'Cinematic',
      resolution: '960x540',
      bounces: 8,
      samples: 384,
      fov: 34,
      focusDistance: 5,
      aperture: 0.015,
    },
  };

  /**
   * @typedef {Object} RenderSettings
   * @property {number} width
   * @property {number} height
   * @property {number} sample
   * @property {number} maxBounces
   * @property {number} cameraYaw
   * @property {number} cameraHeight
   * @property {number} fov
   * @property {number} focusDistance
   * @property {number} aperture
   */

  /**
   * Builds the immutable render config sent to the worker for one sample.
   * @param {RenderSettings} settings
   * @returns {Object}
   */
  function buildRenderConfig(settings) {
    const yaw = settings.cameraYaw * Math.PI / 180;
    const cameraRadius = 5.4;
    const lookFrom = [
      Math.sin(yaw) * cameraRadius,
      settings.cameraHeight,
      Math.cos(yaw) * cameraRadius,
    ];

    return {
      width: settings.width,
      height: settings.height,
      sample: settings.sample,
      maxBounces: settings.maxBounces,
      camera: {
        width: settings.width,
        height: settings.height,
        fov: settings.fov,
        lookFrom,
        lookAt: [0, 0.66, 0],
        focusDistance: settings.focusDistance,
        aperture: settings.aperture,
      },
    };
  }

  /**
   * @typedef {Object} SceneSettings
   * @property {string} preset
   * @property {number} warmth
   * @property {number} intensity
   */

  /**
   * Creates the path tracing scene from compact UI settings.
   * @param {SceneSettings} settings
   * @returns {Object}
   */
  function buildScene(settings) {
    const warmth = settings.warmth;
    const intensity = settings.intensity;
    const sunColor = [
      0.82 + warmth * 0.42,
      0.86 + warmth * 0.16,
      1 - warmth * 0.32,
    ];
    const shared = {
      planes: [
        {
          point: [0, -0.02, 0],
          normal: [0, 1, 0],
          material: {
            type: 'diffuse',
            color: [0.62, 0.66, 0.68],
            altColor: [0.28, 0.34, 0.4],
            checkerScale: 2.2,
          },
        },
      ],
      sky: {
        horizon: [0.82, 0.88, 0.92],
        zenith: [0.16, 0.24, 0.36],
      },
      sun: {
        direction: [-0.38, 0.82, 0.42],
        color: sunColor,
        intensity,
      },
    };

    const materialSet = {
      clay: { type: 'diffuse', color: [0.78, 0.27, 0.22] },
      blue: { type: 'diffuse', color: [0.15, 0.35, 0.95] },
      gold: { type: 'metal', color: [0.96, 0.76, 0.38], fuzz: 0.055 },
      brushedGold: { type: 'metal', color: [0.88, 0.7, 0.34], fuzz: 0.16 },
      chrome: { type: 'metal', color: [0.82, 0.88, 0.92], fuzz: 0.015 },
      glass: { type: 'glass', color: [0.9, 0.98, 1], ior: 1.5 },
      smokeGlass: { type: 'glass', color: [0.68, 0.82, 0.96], ior: 1.33 },
    };

    if (settings.preset === 'showcase') {
      return {
        ...shared,
        spheres: [
          { center: [-1.34, 0.58, 0.08], radius: 0.58, material: materialSet.clay },
          { center: [0, 0.74, -0.18], radius: 0.74, material: materialSet.glass },
          { center: [1.34, 0.58, 0.08], radius: 0.58, material: materialSet.gold },
          { center: [-0.56, 0.25, 1.02], radius: 0.25, material: materialSet.chrome },
          { center: [0.72, 0.21, 1.04], radius: 0.21, material: materialSet.brushedGold },
          { center: [-1.45, 3.85, 1.7], radius: 0.55, material: { type: 'diffuse', color: sunColor, emission: intensity * 3.1 } },
        ],
      };
    }

    if (settings.preset === 'glass') {
      return {
        ...shared,
        spheres: [
          { center: [-1.4, 0.75, 0], radius: 0.75, material: materialSet.glass },
          { center: [0.35, 0.55, -0.35], radius: 0.55, material: materialSet.smokeGlass },
          { center: [1.45, 0.68, 0.18], radius: 0.68, material: materialSet.gold },
          { center: [0, 4.6, -1.6], radius: 0.8, material: { type: 'diffuse', color: sunColor, emission: intensity * 2.6 } },
        ],
      };
    }

    if (settings.preset === 'metal') {
      return {
        ...shared,
        spheres: [
          { center: [-1.35, 0.7, -0.1], radius: 0.7, material: materialSet.chrome },
          { center: [0.1, 0.8, 0.05], radius: 0.8, material: materialSet.gold },
          { center: [1.55, 0.5, -0.25], radius: 0.5, material: { type: 'metal', color: [0.7, 0.82, 0.95], fuzz: 0.18 } },
          { center: [0, 4.6, -1.6], radius: 0.8, material: { type: 'diffuse', color: sunColor, emission: intensity * 2.6 } },
        ],
      };
    }

    return {
      ...shared,
      spheres: [
        { center: [-1.25, 0.65, 0], radius: 0.65, material: materialSet.clay },
        { center: [0.05, 0.8, -0.2], radius: 0.8, material: materialSet.glass },
        { center: [1.45, 0.58, 0.1], radius: 0.58, material: materialSet.gold },
        { center: [0, 4.6, -1.6], radius: 0.8, material: { type: 'diffuse', color: sunColor, emission: intensity * 2.6 } },
      ],
    };
  }

  /**
   * Creates center-prioritized tiles so the first visible samples resolve the focal objects.
   * @param {number} width
   * @param {number} height
   * @param {number} tileSize
   * @returns {Array<{x0:number,y0:number,x1:number,y1:number}>}
   */
  function createTiles(width, height, tileSize) {
    const tiles = [];

    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        tiles.push({
          x0: x,
          y0: y,
          x1: Math.min(width, x + tileSize),
          y1: Math.min(height, y + tileSize),
        });
      }
    }

    return tiles.sort((a, b) => {
      const ax = (a.x0 + a.x1) / 2 - width / 2;
      const ay = (a.y0 + a.y1) / 2 - height / 2;
      const bx = (b.x0 + b.x1) / 2 - width / 2;
      const by = (b.y0 + b.y1) / 2 - height / 2;
      return Math.hypot(bx, by) - Math.hypot(ax, ay);
    });
  }

  /**
   * Converts a linear color channel to an sRGB byte through ACES, contrast, and gamma.
   * @param {number} value
   * @param {number} exposure
   * @param {number} contrast
   * @returns {number}
   */
  function toByte(value, exposure, contrast) {
    const mapped = acesFilm(value * exposure);
    const contrasted = clamp(0.5 + (mapped - 0.5) * contrast, 0, 1);
    const corrected = Math.pow(contrasted, 1 / 2.2);
    return Math.max(0, Math.min(255, Math.round(corrected * 255)));
  }

  /**
   * @param {number} value
   * @returns {number}
   */
  function acesFilm(value) {
    const safeValue = Math.max(0, value);
    const numerator = safeValue * (2.51 * safeValue + 0.03);
    const denominator = safeValue * (2.43 * safeValue + 0.59) + 0.14;
    return clamp(numerator / denominator, 0, 1);
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  function formatNumber(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return String(value);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainderSeconds = safeSeconds % 60;

    if (minutes === 0) {
      return `${remainderSeconds}s`;
    }

    return `${minutes}m ${String(remainderSeconds).padStart(2, '0')}s`;
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return {
    TILE_SIZE,
    DISPLAY_ASPECT_RATIO,
    ADAPTIVE_MIN_SAMPLES,
    ADAPTIVE_VARIANCE_THRESHOLD,
    QUALITY_PROFILES,
    acesFilm,
    buildRenderConfig,
    buildScene,
    clamp,
    createTiles,
    formatDuration,
    formatNumber,
    toByte,
  };
}));
