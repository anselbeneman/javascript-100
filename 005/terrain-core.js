(function attachTerrainCore(global) {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const DEFAULT_CONFIG = {
    seed: 'recruiter-map-005',
    preset: 'alpine',
    size: 384,
    scale: 3.2,
    seaLevel: 0.44,
    relief: 1.22,
    erosion: 0.38,
    warp: 0.42,
    octaves: 6,
    rivers: 0.58,
    shade: true,
    contours: true,
    palette: 'temperate',
    island: 0,
    moistureBias: 0,
  };

  const PRESETS = {
    alpine: {
      seed: 'recruiter-map-005',
      preset: 'alpine',
      scale: 3.2,
      seaLevel: 0.44,
      relief: 1.22,
      erosion: 0.38,
      warp: 0.42,
      octaves: 6,
      rivers: 0.58,
      palette: 'temperate',
      island: 0.12,
      moistureBias: 0.08,
    },
    islands: {
      seed: 'archipelago-demo',
      preset: 'islands',
      scale: 4.5,
      seaLevel: 0.54,
      relief: 1.04,
      erosion: 0.28,
      warp: 0.66,
      octaves: 6,
      rivers: 0.35,
      palette: 'tropical',
      island: 0.82,
      moistureBias: 0.16,
    },
    canyon: {
      seed: 'red-canyon-basin',
      preset: 'canyon',
      scale: 2.8,
      seaLevel: 0.32,
      relief: 1.46,
      erosion: 0.18,
      warp: 0.3,
      octaves: 5,
      rivers: 0.42,
      palette: 'arid',
      island: 0,
      moistureBias: -0.2,
    },
    glacier: {
      seed: 'north-fjord-77',
      preset: 'glacier',
      scale: 3.65,
      seaLevel: 0.48,
      relief: 1.34,
      erosion: 0.56,
      warp: 0.5,
      octaves: 7,
      rivers: 0.72,
      palette: 'glacial',
      island: 0.32,
      moistureBias: 0.2,
    },
  };

  const PALETTES = {
    temperate: {
      deepWater: [10, 45, 78],
      water: [38, 112, 146],
      shallow: [75, 145, 158],
      beach: [205, 183, 117],
      low: [92, 142, 71],
      forest: [47, 94, 58],
      high: [120, 119, 103],
      rock: [105, 104, 98],
      snow: [232, 238, 226],
      river: [85, 168, 190],
    },
    tropical: {
      deepWater: [8, 59, 86],
      water: [31, 128, 153],
      shallow: [88, 177, 175],
      beach: [223, 199, 129],
      low: [82, 160, 88],
      forest: [38, 113, 73],
      high: [136, 138, 93],
      rock: [118, 116, 95],
      snow: [230, 235, 218],
      river: [82, 184, 196],
    },
    arid: {
      deepWater: [23, 55, 72],
      water: [50, 108, 128],
      shallow: [90, 138, 133],
      beach: [191, 157, 92],
      low: [168, 103, 62],
      forest: [92, 100, 58],
      high: [178, 134, 82],
      rock: [119, 87, 73],
      snow: [222, 210, 188],
      river: [80, 148, 168],
    },
    glacial: {
      deepWater: [14, 52, 82],
      water: [43, 106, 143],
      shallow: [112, 168, 180],
      beach: [169, 170, 145],
      low: [107, 134, 105],
      forest: [67, 100, 85],
      high: [143, 146, 136],
      rock: [112, 120, 120],
      snow: [236, 242, 239],
      river: [141, 204, 213],
    },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function fade(value) {
    return value * value * value * (value * (value * 6 - 15) + 10);
  }

  function hashSeed(seedText) {
    const text = String(seedText || DEFAULT_CONFIG.seed);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0 || 1;
  }

  function hashGrid(x, y, seed) {
    let hash = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967295;
  }

  function valueNoise(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = fade(x - x0);
    const ty = fade(y - y0);

    const a = hashGrid(x0, y0, seed);
    const b = hashGrid(x0 + 1, y0, seed);
    const c = hashGrid(x0, y0 + 1, seed);
    const d = hashGrid(x0 + 1, y0 + 1, seed);

    return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
  }

  function fbm(x, y, octaves, lacunarity, persistence, seed) {
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    let normalizer = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
      total += valueNoise(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
      normalizer += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / normalizer;
  }

  function ridged(x, y, octaves, seed) {
    const noise = fbm(x, y, octaves, 2.03, 0.52, seed);
    return 1 - Math.abs(noise * 2 - 1);
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalizeConfig(input) {
    const presetName = input && PRESETS[input.preset] ? input.preset : DEFAULT_CONFIG.preset;
    const preset = PRESETS[presetName] || {};
    const merged = Object.assign({}, DEFAULT_CONFIG, preset, input || {});

    return {
      seed: String(merged.seed || preset.seed || DEFAULT_CONFIG.seed).slice(0, 48),
      preset: presetName,
      size: clamp(Math.round(Number(merged.size) || DEFAULT_CONFIG.size), 128, 640),
      scale: clamp(Number(merged.scale), 1.2, 7),
      seaLevel: clamp(Number(merged.seaLevel), 0.2, 0.72),
      relief: clamp(Number(merged.relief), 0.55, 2),
      erosion: clamp(Number(merged.erosion), 0, 1),
      warp: clamp(Number(merged.warp), 0, 1.25),
      octaves: clamp(Math.round(Number(merged.octaves) || DEFAULT_CONFIG.octaves), 2, 9),
      rivers: clamp(Number(merged.rivers), 0, 1),
      shade: Boolean(merged.shade),
      contours: Boolean(merged.contours),
      palette: PALETTES[merged.palette] ? merged.palette : DEFAULT_CONFIG.palette,
      island: clamp(Number(merged.island), 0, 1),
      moistureBias: clamp(Number(merged.moistureBias), -0.4, 0.4),
    };
  }

  function normalizeHeights(heights) {
    let min = Infinity;
    let max = -Infinity;

    for (let index = 0; index < heights.length; index += 1) {
      const value = heights[index];
      if (value < min) min = value;
      if (value > max) max = value;
    }

    const range = Math.max(0.0001, max - min);
    for (let index = 0; index < heights.length; index += 1) {
      heights[index] = clamp((heights[index] - min) / range, 0, 1);
    }
  }

  function applyThermalErosion(heights, width, height, iterations, strength) {
    if (iterations <= 0 || strength <= 0) {
      return;
    }

    const deltas = new Float32Array(heights.length);
    const talus = 0.018 + (1 - strength) * 0.012;
    const neighbors = [-1, 1, -width, width];

    for (let pass = 0; pass < iterations; pass += 1) {
      deltas.fill(0);

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          const current = heights[index];

          for (let n = 0; n < neighbors.length; n += 1) {
            const neighborIndex = index + neighbors[n];
            const diff = current - heights[neighborIndex];

            if (diff > talus) {
              const move = (diff - talus) * 0.075 * strength;
              deltas[index] -= move;
              deltas[neighborIndex] += move;
            }
          }
        }
      }

      for (let index = 0; index < heights.length; index += 1) {
        heights[index] = clamp(heights[index] + deltas[index], 0, 1);
      }
    }
  }

  function generateTerrain(configInput) {
    const config = normalizeConfig(configInput);
    const seed = hashSeed(config.seed);
    const width = config.size;
    const height = config.size;
    const heightMap = new Float32Array(width * height);
    const moistureMap = new Float32Array(width * height);
    const slopeMap = new Float32Array(width * height);

    for (let y = 0; y < height; y += 1) {
      const v = height <= 1 ? 0 : y / (height - 1);

      for (let x = 0; x < width; x += 1) {
        const u = width <= 1 ? 0 : x / (width - 1);
        const nx = (u - 0.5) * config.scale;
        const ny = (v - 0.5) * config.scale;

        const warpX = (fbm(nx * 0.62 + 11.7, ny * 0.62 - 3.1, 3, 2.1, 0.5, seed + 17) - 0.5) * config.warp;
        const warpY = (fbm(nx * 0.62 - 9.6, ny * 0.62 + 5.4, 3, 2.1, 0.5, seed + 31) - 0.5) * config.warp;
        const wx = nx + warpX;
        const wy = ny + warpY;

        const base = fbm(wx, wy, config.octaves, 2.02, 0.52, seed + 101);
        const mountain = ridged(wx * 1.28 + 8.5, wy * 1.28 - 2.4, Math.max(3, config.octaves - 1), seed + 409);
        const detail = fbm(wx * 3.4 - 2.2, wy * 3.4 + 4.7, 3, 2.18, 0.45, seed + 809);

        let value = base * 0.52 + mountain * 0.34 + detail * 0.14;
        value = 0.5 + (value - 0.5) * config.relief;

        if (config.preset === 'canyon') {
          const striation = Math.sin((wx * 2.8 + wy * 1.1) * TWO_PI) * 0.025;
          value = value * 0.9 + mountain * 0.1 + striation;
        }

        if (config.island > 0) {
          const dx = (u - 0.5) * 2;
          const dy = (v - 0.5) * 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const falloff = smoothstep(1.08, 0.12, distance);
          value = lerp(value, value * falloff - (1 - falloff) * 0.18, config.island);
        }

        heightMap[y * width + x] = value;
      }
    }

    normalizeHeights(heightMap);
    applyThermalErosion(heightMap, width, height, Math.round(config.erosion * 18), config.erosion);
    normalizeHeights(heightMap);

    for (let y = 0; y < height; y += 1) {
      const v = height <= 1 ? 0 : y / (height - 1);

      for (let x = 0; x < width; x += 1) {
        const u = width <= 1 ? 0 : x / (width - 1);
        const index = y * width + x;
        const nx = (u - 0.5) * config.scale;
        const ny = (v - 0.5) * config.scale;
        const moisture = fbm(nx * 0.82 - 12.3, ny * 0.82 + 6.6, 5, 2, 0.55, seed + 1237);

        moistureMap[index] = clamp(moisture + config.moistureBias + (1 - heightMap[index]) * 0.18, 0, 1);

        const left = heightMap[y * width + Math.max(0, x - 1)];
        const right = heightMap[y * width + Math.min(width - 1, x + 1)];
        const up = heightMap[Math.max(0, y - 1) * width + x];
        const down = heightMap[Math.min(height - 1, y + 1) * width + x];
        const dx = (right - left) * config.relief;
        const dy = (down - up) * config.relief;
        slopeMap[index] = clamp(Math.sqrt(dx * dx + dy * dy) * 3.4, 0, 1);
      }
    }

    return {
      config,
      seed,
      width,
      height,
      heightMap,
      moistureMap,
      slopeMap,
    };
  }

  function mixColor(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t)),
    ];
  }

  function scaleColor(color, shade) {
    return [
      clamp(Math.round(color[0] * shade), 0, 255),
      clamp(Math.round(color[1] * shade), 0, 255),
      clamp(Math.round(color[2] * shade), 0, 255),
    ];
  }

  function riverPotential(x, y, width, height, terrain) {
    const config = terrain.config;
    if (config.rivers <= 0) {
      return 0;
    }

    const u = width <= 1 ? 0 : x / (width - 1);
    const v = height <= 1 ? 0 : y / (height - 1);
    const nx = (u - 0.5) * config.scale;
    const ny = (v - 0.5) * config.scale;
    const valley = Math.abs(fbm(nx * 1.75 + 21, ny * 1.75 - 18, 4, 2.2, 0.5, terrain.seed + 2203) - 0.5);
    const index = y * width + x;
    const elevation = terrain.heightMap[index];
    const aboveSea = smoothstep(config.seaLevel + 0.02, config.seaLevel + 0.32, elevation);
    const belowPeak = 1 - smoothstep(0.78, 0.96, elevation);
    const wetEnough = smoothstep(0.28, 0.7, terrain.moistureMap[index]);

    return (1 - smoothstep(0.008, 0.052, valley)) * aboveSea * belowPeak * wetEnough * config.rivers;
  }

  function classifyBiome(elevation, moisture, slope, river, config) {
    if (elevation < config.seaLevel - 0.07) return 'Deep Water';
    if (elevation < config.seaLevel) return 'Water';
    if (elevation < config.seaLevel + 0.035) return 'Beach';
    if (river > 0.45) return 'River';
    if (elevation > 0.82) return 'Snow';
    if (slope > 0.42 && elevation > 0.58) return 'Rock';
    if (config.palette === 'arid' && moisture < 0.5) return 'Canyon';
    if (moisture < 0.26) return 'Dry Grass';
    if (moisture > 0.66) return 'Forest';
    return 'Grassland';
  }

  function colorForBiome(biome, elevation, moisture, slope, river, config) {
    const palette = PALETTES[config.palette] || PALETTES.temperate;

    if (biome === 'Deep Water') {
      return mixColor(palette.deepWater, palette.water, smoothstep(0, config.seaLevel, elevation));
    }

    if (biome === 'Water') {
      return mixColor(palette.water, palette.shallow, smoothstep(config.seaLevel - 0.07, config.seaLevel, elevation));
    }

    if (biome === 'Beach') {
      return mixColor(palette.beach, palette.low, smoothstep(config.seaLevel, config.seaLevel + 0.06, elevation) * 0.35);
    }

    if (biome === 'River') {
      return mixColor(palette.river, palette.shallow, 1 - clamp(river, 0, 1));
    }

    if (biome === 'Snow') {
      return mixColor(palette.rock, palette.snow, smoothstep(0.78, 0.95, elevation));
    }

    if (biome === 'Rock') {
      return mixColor(palette.high, palette.rock, clamp(slope * 1.4, 0, 1));
    }

    if (biome === 'Canyon') {
      return mixColor(palette.low, palette.high, clamp(elevation * 0.85 + slope * 0.45, 0, 1));
    }

    if (biome === 'Dry Grass') {
      return mixColor(palette.beach, palette.low, smoothstep(0.18, 0.55, moisture));
    }

    if (biome === 'Forest') {
      return mixColor(palette.low, palette.forest, smoothstep(0.45, 0.85, moisture));
    }

    return mixColor(palette.low, palette.high, smoothstep(0.48, 0.76, elevation) * 0.35);
  }

  function contourShade(elevation, seaLevel) {
    if (elevation < seaLevel) {
      return 1;
    }

    const contour = Math.abs((elevation * 42) % 1);
    return contour < 0.035 || contour > 0.965 ? 0.76 : 1;
  }

  function renderTerrain(configInput) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const terrain = generateTerrain(configInput);
    const config = terrain.config;
    const width = terrain.width;
    const height = terrain.height;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const light = { x: -0.48, y: -0.62, z: 0.62 };
    let landCount = 0;
    let peakCount = 0;
    let mean = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const pixelIndex = index * 4;
        const elevation = terrain.heightMap[index];
        const moisture = terrain.moistureMap[index];
        const slope = terrain.slopeMap[index];
        const river = riverPotential(x, y, width, height, terrain);
        const biome = classifyBiome(elevation, moisture, slope, river, config);
        let color = colorForBiome(biome, elevation, moisture, slope, river, config);

        if (config.shade) {
          const left = terrain.heightMap[y * width + Math.max(0, x - 1)];
          const right = terrain.heightMap[y * width + Math.min(width - 1, x + 1)];
          const up = terrain.heightMap[Math.max(0, y - 1) * width + x];
          const down = terrain.heightMap[Math.min(height - 1, y + 1) * width + x];
          const normalX = (left - right) * config.relief * 3.2;
          const normalY = (up - down) * config.relief * 3.2;
          const normalZ = 1;
          const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
          const dot = (normalX / length) * light.x + (normalY / length) * light.y + (normalZ / length) * light.z;
          color = scaleColor(color, 0.72 + clamp(dot, -0.2, 1) * 0.34);
        }

        if (config.contours) {
          color = scaleColor(color, contourShade(elevation, config.seaLevel));
        }

        if (river > 0.35 && elevation > config.seaLevel) {
          color = mixColor(color, PALETTES[config.palette].river, clamp(river * 0.95, 0, 1));
        }

        pixels[pixelIndex] = color[0];
        pixels[pixelIndex + 1] = color[1];
        pixels[pixelIndex + 2] = color[2];
        pixels[pixelIndex + 3] = 255;

        if (elevation >= config.seaLevel) {
          landCount += 1;
        }

        if (elevation > 0.82 && slope > 0.18) {
          peakCount += 1;
        }

        mean += elevation;
        if (elevation < min) min = elevation;
        if (elevation > max) max = elevation;
      }
    }

    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cellCount = width * height;

    return {
      pixels,
      heightMap: terrain.heightMap,
      moistureMap: terrain.moistureMap,
      slopeMap: terrain.slopeMap,
      config,
      stats: {
        width,
        height,
        seedHash: terrain.seed.toString(16).padStart(8, '0'),
        landRatio: landCount / cellCount,
        peakCount,
        meanHeight: mean / cellCount,
        minHeight: min,
        maxHeight: max,
        renderMs: end - start,
      },
    };
  }

  function sampleAt(result, x, y) {
    if (!result || !result.heightMap || !result.moistureMap || !result.slopeMap) {
      return null;
    }

    const width = result.stats.width;
    const height = result.stats.height;
    const sx = clamp(Math.round(x), 0, width - 1);
    const sy = clamp(Math.round(y), 0, height - 1);
    const index = sy * width + sx;
    const elevation = result.heightMap[index];
    const moisture = result.moistureMap[index];
    const slope = result.slopeMap[index];
    const river = riverPotential(sx, sy, width, height, {
      config: result.config,
      seed: hashSeed(result.config.seed),
      heightMap: result.heightMap,
      moistureMap: result.moistureMap,
      slopeMap: result.slopeMap,
    });

    return {
      x: sx,
      y: sy,
      elevation,
      moisture,
      slope,
      biome: classifyBiome(elevation, moisture, slope, river, result.config),
    };
  }

  function createSeed(prefix) {
    const random = createRandom((Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0);
    const token = Math.floor(random() * 0xffffff).toString(16).padStart(6, '0');
    return `${prefix || 'terrain'}-${token}`;
  }

  global.TerrainCore = {
    presets: PRESETS,
    normalizeConfig,
    renderTerrain,
    sampleAt,
    createSeed,
  };
}(typeof self !== 'undefined' ? self : window));
