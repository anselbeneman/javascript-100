(function exposeRenderCore(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.RayTracerCore = api;
}(typeof self !== 'undefined' ? self : globalThis, function createRenderCore() {
  'use strict';

  const PI = Math.PI;
  const EPSILON = 0.001;

  /**
   * @typedef {Object} Tile
   * @property {number} x0
   * @property {number} y0
   * @property {number} x1
   * @property {number} y1
   */

  /**
   * Renders one tile and returns a transferable payload for the worker shell.
   * @param {Object} message
   * @param {{shouldCancel?: function(number): boolean}} [options]
   * @returns {Object|null}
   */
  function renderTile(message, options = {}) {
    const { jobId, tile, config, scene } = message;
    const shouldCancel = typeof options.shouldCancel === 'function'
      ? options.shouldCancel
      : () => false;
    const width = config.width;
    const height = config.height;
    const tileWidth = tile.x1 - tile.x0;
    const tileHeight = tile.y1 - tile.y0;
    const pixels = new Float32Array(tileWidth * tileHeight * 3);
    let rays = 0;
    let luminanceSum = 0;
    let luminanceSquaredSum = 0;

    const camera = buildCamera(config.camera);
    const seedBase = hash(jobId * 73856093 + tile.x0 * 19349663 + tile.y0 * 83492791 + config.sample * 2654435761);

    let pixelIndex = 0;
    for (let y = tile.y0; y < tile.y1; y += 1) {
      for (let x = tile.x0; x < tile.x1; x += 1) {
        const rng = createRng(seedBase + x * 374761393 + y * 668265263);
        const jitterX = rng();
        const jitterY = rng();
        const u = (x + jitterX) / Math.max(1, width - 1);
        const v = (y + jitterY) / Math.max(1, height - 1);
        const ray = getCameraRay(camera, u, v, rng);
        const result = traceRay(ray, scene, config.maxBounces, rng);

        pixels[pixelIndex] = result[0];
        pixels[pixelIndex + 1] = result[1];
        pixels[pixelIndex + 2] = result[2];
        const luma = luminance(result);
        luminanceSum += luma;
        luminanceSquaredSum += luma * luma;
        pixelIndex += 3;
        rays += result[3];
      }

      if (shouldCancel(jobId)) {
        return null;
      }
    }

    return {
      type: 'tile',
      jobId,
      tile,
      sample: config.sample,
      rays,
      mean: luminanceSum / Math.max(1, tileWidth * tileHeight),
      variance: Math.max(0, luminanceSquaredSum / Math.max(1, tileWidth * tileHeight) - (luminanceSum / Math.max(1, tileWidth * tileHeight)) ** 2),
      pixels,
    };
  }

  /**
   * @param {Array<number>} color
   * @returns {number}
   */
  function luminance(color) {
    return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  }

  /**
   * @param {Object} cameraConfig
   * @returns {Object}
   */
  function buildCamera(cameraConfig) {
    const lookFrom = cameraConfig.lookFrom;
    const lookAt = cameraConfig.lookAt;
    const up = [0, 1, 0];
    const aspect = cameraConfig.width / cameraConfig.height;
    const theta = cameraConfig.fov * PI / 180;
    const viewportHeight = 2 * Math.tan(theta / 2);
    const viewportWidth = aspect * viewportHeight;
    const focusDistance = cameraConfig.focusDistance || length(sub(lookFrom, lookAt));
    const lensRadius = (cameraConfig.aperture || 0) / 2;

    const w = normalize(sub(lookFrom, lookAt));
    const u = normalize(cross(up, w));
    const v = cross(w, u);

    const horizontal = mul(u, viewportWidth * focusDistance);
    const vertical = mul(v, viewportHeight * focusDistance);
    const lowerLeft = sub(sub(sub(lookFrom, div(horizontal, 2)), div(vertical, 2)), mul(w, focusDistance));

    return { origin: lookFrom, horizontal, vertical, lowerLeft, u, v, lensRadius };
  }

  /**
   * @param {Object} camera
   * @param {number} s
   * @param {number} t
   * @param {function(): number} rng
   * @returns {{origin:Array<number>,direction:Array<number>}}
   */
  function getCameraRay(camera, s, t, rng) {
    const lensSample = mul(randomInUnitDisk(rng), camera.lensRadius);
    const offset = add(mul(camera.u, lensSample[0]), mul(camera.v, lensSample[1]));
    const focalPoint = add(add(camera.lowerLeft, mul(camera.horizontal, s)), mul(camera.vertical, 1 - t));
    const origin = add(camera.origin, offset);
    const direction = normalize(sub(focalPoint, origin));
    return { origin, direction };
  }

  /**
   * @param {{origin:Array<number>,direction:Array<number>}} ray
   * @param {Object} scene
   * @param {number} maxBounces
   * @param {function(): number} rng
   * @returns {Array<number>}
   */
  function traceRay(ray, scene, maxBounces, rng) {
    let throughput = [1, 1, 1];
    let radiance = [0, 0, 0];
    let currentRay = ray;
    let rayCount = 0;

    for (let bounce = 0; bounce < maxBounces; bounce += 1) {
      rayCount += 1;
      const hit = hitScene(scene, currentRay, EPSILON, 1000);

      if (!hit) {
        const sky = skyColor(currentRay.direction, scene);
        radiance = add(radiance, multiply(throughput, sky));
        break;
      }

      if (hit.material.emission) {
        radiance = add(radiance, multiply(throughput, mul(hit.material.color, hit.material.emission)));
      }

      if (bounce === 0 && hit.material.type === 'diffuse') {
        radiance = add(radiance, multiply(throughput, directSunLight(hit, scene)));
      }

      const scattered = scatter(hit, currentRay, rng);
      if (!scattered) {
        break;
      }

      throughput = multiply(throughput, scattered.attenuation);
      currentRay = scattered.ray;

      if (bounce > 2) {
        const keep = clamp(Math.max(throughput[0], throughput[1], throughput[2]), 0.12, 0.95);
        if (rng() > keep) {
          break;
        }
        throughput = div(throughput, keep);
      }
    }

    return [radiance[0], radiance[1], radiance[2], rayCount];
  }

  function directSunLight(hit, scene) {
    const sunDirection = normalize(scene.sun.direction);
    const diffuse = Math.max(0, dot(hit.normal, sunDirection));

    if (diffuse <= 0) {
      return [0, 0, 0];
    }

    const shadowOrigin = add(hit.point, mul(hit.normal, EPSILON * 4));
    const shadowHit = hitScene(scene, { origin: shadowOrigin, direction: sunDirection }, EPSILON, 1000);

    if (shadowHit && !shadowHit.material.emission) {
      return [0, 0, 0];
    }

    const strength = scene.sun.intensity * diffuse * 0.42;
    return multiply(hit.material.color, mul(scene.sun.color, strength));
  }

  function hitScene(scene, ray, minT, maxT) {
    let closest = maxT;
    let record = null;

    for (let i = 0; i < scene.spheres.length; i += 1) {
      const hit = hitSphere(scene.spheres[i], ray, minT, closest);
      if (hit) {
        closest = hit.t;
        record = hit;
      }
    }

    for (let i = 0; i < scene.planes.length; i += 1) {
      const hit = hitPlane(scene.planes[i], ray, minT, closest);
      if (hit) {
        closest = hit.t;
        record = hit;
      }
    }

    return record;
  }

  function hitSphere(sphere, ray, minT, maxT) {
    const oc = sub(ray.origin, sphere.center);
    const a = dot(ray.direction, ray.direction);
    const halfB = dot(oc, ray.direction);
    const c = dot(oc, oc) - sphere.radius * sphere.radius;
    const discriminant = halfB * halfB - a * c;

    if (discriminant < 0) {
      return null;
    }

    const sqrtD = Math.sqrt(discriminant);
    let root = (-halfB - sqrtD) / a;

    if (root < minT || root > maxT) {
      root = (-halfB + sqrtD) / a;
      if (root < minT || root > maxT) {
        return null;
      }
    }

    const point = add(ray.origin, mul(ray.direction, root));
    let normal = div(sub(point, sphere.center), sphere.radius);
    const frontFace = dot(ray.direction, normal) < 0;
    if (!frontFace) {
      normal = mul(normal, -1);
    }

    return {
      t: root,
      point,
      normal,
      frontFace,
      material: sphere.material,
    };
  }

  function hitPlane(plane, ray, minT, maxT) {
    const denom = dot(plane.normal, ray.direction);

    if (Math.abs(denom) < 0.0001) {
      return null;
    }

    const t = dot(sub(plane.point, ray.origin), plane.normal) / denom;

    if (t < minT || t > maxT) {
      return null;
    }

    const point = add(ray.origin, mul(ray.direction, t));
    let normal = normalize(plane.normal);
    const frontFace = dot(ray.direction, normal) < 0;
    if (!frontFace) {
      normal = mul(normal, -1);
    }

    let baseColor = plane.material.color;
    const checkerScale = plane.material.checkerScale || 0;
    if (checkerScale > 0 && plane.material.altColor) {
      const checker = Math.floor(point[0] * checkerScale) + Math.floor(point[2] * checkerScale);
      baseColor = checker % 2 === 0 ? plane.material.color : plane.material.altColor;
    }

    return {
      t,
      point,
      normal,
      frontFace,
      material: { ...plane.material, color: baseColor },
    };
  }

  function scatter(hit, ray, rng) {
    const material = hit.material;

    if (material.type === 'diffuse') {
      let target = add(hit.normal, randomUnitVector(rng));
      if (nearZero(target)) {
        target = hit.normal;
      }
      return {
        ray: { origin: add(hit.point, mul(hit.normal, EPSILON)), direction: normalize(target) },
        attenuation: material.color,
      };
    }

    if (material.type === 'metal') {
      const reflected = reflect(normalize(ray.direction), hit.normal);
      const fuzz = material.fuzz || 0;
      const direction = normalize(add(reflected, mul(randomInUnitSphere(rng), fuzz)));

      if (dot(direction, hit.normal) <= 0) {
        return null;
      }

      return {
        ray: { origin: add(hit.point, mul(hit.normal, EPSILON)), direction },
        attenuation: material.color,
      };
    }

    if (material.type === 'glass') {
      const refractionRatio = hit.frontFace ? 1 / material.ior : material.ior;
      const unitDirection = normalize(ray.direction);
      const cosTheta = Math.min(dot(mul(unitDirection, -1), hit.normal), 1);
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const cannotRefract = refractionRatio * sinTheta > 1;
      const reflectChance = reflectance(cosTheta, refractionRatio);
      const direction = cannotRefract || reflectChance > rng()
        ? reflect(unitDirection, hit.normal)
        : refract(unitDirection, hit.normal, refractionRatio);

      return {
        ray: { origin: add(hit.point, mul(direction, EPSILON)), direction: normalize(direction) },
        attenuation: material.color,
      };
    }

    return null;
  }

  function skyColor(direction, scene) {
    const t = 0.5 * (direction[1] + 1);
    const horizon = scene.sky.horizon;
    const zenith = scene.sky.zenith;
    const sunDirection = normalize(scene.sun.direction);
    const sun = Math.pow(Math.max(0, dot(direction, sunDirection)), 420) * scene.sun.intensity;
    const sky = add(mul(horizon, 1 - t), mul(zenith, t));
    return add(sky, mul(scene.sun.color, sun));
  }

  function reflectance(cosine, refractionRatio) {
    let r0 = (1 - refractionRatio) / (1 + refractionRatio);
    r0 *= r0;
    return r0 + (1 - r0) * Math.pow(1 - cosine, 5);
  }

  function randomUnitVector(rng) {
    return normalize(randomInUnitSphere(rng));
  }

  function randomInUnitSphere(rng) {
    while (true) {
      const point = [
        rng() * 2 - 1,
        rng() * 2 - 1,
        rng() * 2 - 1,
      ];
      if (dot(point, point) < 1) {
        return point;
      }
    }
  }

  function randomInUnitDisk(rng) {
    while (true) {
      const point = [
        rng() * 2 - 1,
        rng() * 2 - 1,
        0,
      ];
      if (dot(point, point) < 1) {
        return point;
      }
    }
  }

  function reflect(vector, normal) {
    return sub(vector, mul(normal, 2 * dot(vector, normal)));
  }

  function refract(uv, normal, etaiOverEtat) {
    const cosTheta = Math.min(dot(mul(uv, -1), normal), 1);
    const rOutPerp = mul(add(uv, mul(normal, cosTheta)), etaiOverEtat);
    const rOutParallel = mul(normal, -Math.sqrt(Math.abs(1 - dot(rOutPerp, rOutPerp))));
    return add(rOutPerp, rOutParallel);
  }

  function createRng(seed) {
    let state = seed >>> 0;
    return function rng() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(value) {
    let x = value >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return x >>> 0;
  }

  function add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function mul(a, scalar) {
    return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
  }

  function div(a, scalar) {
    return [a[0] / scalar, a[1] / scalar, a[2] / scalar];
  }

  function multiply(a, b) {
    return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  function length(a) {
    return Math.sqrt(dot(a, a));
  }

  function normalize(a) {
    const len = length(a);
    if (len === 0) {
      return [0, 0, 0];
    }
    return div(a, len);
  }

  function nearZero(a) {
    return Math.abs(a[0]) < 0.000001 && Math.abs(a[1]) < 0.000001 && Math.abs(a[2]) < 0.000001;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return {
    EPSILON,
    add,
    buildCamera,
    clamp,
    createRng,
    cross,
    directSunLight,
    div,
    dot,
    getCameraRay,
    hash,
    hitPlane,
    hitScene,
    hitSphere,
    length,
    luminance,
    mul,
    multiply,
    nearZero,
    normalize,
    randomInUnitDisk,
    randomInUnitSphere,
    randomUnitVector,
    reflect,
    reflectance,
    refract,
    renderTile,
    scatter,
    skyColor,
    sub,
    traceRay,
  };
}));
