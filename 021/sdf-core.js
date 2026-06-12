(function attachSdfCore(global) {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function vec3(x, y, z) {
    return { x, y, z };
  }

  function add(a, b) {
    return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  function sub(a, b) {
    return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  function mul(a, scalar) {
    return vec3(a.x * scalar, a.y * scalar, a.z * scalar);
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function length3(a) {
    return Math.sqrt(dot(a, a));
  }

  function normalize(a) {
    const value = length3(a) || 1;
    return mul(a, 1 / value);
  }

  function abs3(a) {
    return vec3(Math.abs(a.x), Math.abs(a.y), Math.abs(a.z));
  }

  function rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return vec3(point.x * cos - point.z * sin, point.y, point.x * sin + point.z * cos);
  }

  function sdSphere(point, radius) {
    return length3(point) - radius;
  }

  function sdBox(point, bounds) {
    const q = sub(abs3(point), bounds);
    const outside = length3(vec3(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0)));
    const inside = Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0);
    return outside + inside;
  }

  function sdTorus(point, major, minor) {
    const qx = Math.sqrt(point.x * point.x + point.z * point.z) - major;
    return Math.sqrt(qx * qx + point.y * point.y) - minor;
  }

  function smoothMin(a, b, k) {
    const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
    return b * (1 - h) + a * h - k * h * (1 - h);
  }

  function sceneDistance(point, options = {}) {
    const preset = options.preset || 'fusion';
    const time = Number(options.time || 0);
    const p = rotateY(point, time * 0.42);
    const floor = point.y + 0.82;

    if (preset === 'box') {
      const box = sdBox(rotateY(sub(p, vec3(0, -0.06, 0)), time + 0.35), vec3(0.54, 0.36, 0.54));
      const sphere = sdSphere(sub(p, vec3(0.25, 0.2, -0.28)), 0.34);
      return Math.min(smoothMin(box, sphere, 0.18), floor);
    }

    if (preset === 'torus') {
      const torus = sdTorus(sub(p, vec3(0, 0.02, 0)), 0.55, 0.16);
      const core = sdSphere(sub(p, vec3(0, 0.02, 0)), 0.28);
      return Math.min(Math.min(torus, core), floor);
    }

    if (preset === 'columns') {
      const a = sdBox(sub(p, vec3(-0.36, -0.1, 0)), vec3(0.16, 0.62, 0.16));
      const b = sdBox(sub(p, vec3(0.36, -0.1, 0)), vec3(0.16, 0.62, 0.16));
      const c = sdSphere(sub(p, vec3(0, 0.28, 0)), 0.32);
      return Math.min(smoothMin(Math.min(a, b), c, 0.12), floor);
    }

    const sphereA = sdSphere(sub(p, vec3(-0.28, 0.02, 0.02)), 0.42);
    const sphereB = sdSphere(sub(p, vec3(0.28, 0.02, -0.02)), 0.42);
    const box = sdBox(rotateY(sub(p, vec3(0, -0.04, 0)), 0.75), vec3(0.26, 0.34, 0.26));
    return Math.min(smoothMin(smoothMin(sphereA, sphereB, 0.22), box, 0.18), floor);
  }

  function estimateNormal(point, options) {
    const e = 0.0015;
    return normalize(vec3(
      sceneDistance(add(point, vec3(e, 0, 0)), options) - sceneDistance(add(point, vec3(-e, 0, 0)), options),
      sceneDistance(add(point, vec3(0, e, 0)), options) - sceneDistance(add(point, vec3(0, -e, 0)), options),
      sceneDistance(add(point, vec3(0, 0, e)), options) - sceneDistance(add(point, vec3(0, 0, -e)), options),
    ));
  }

  function traceRay(origin, direction, options = {}) {
    const maxSteps = clamp(Math.round(options.maxSteps || 86), 12, 180);
    const maxDistance = Number(options.maxDistance || 6.5);
    const epsilon = Number(options.epsilon || 0.0016);
    let travel = 0;

    for (let step = 0; step < maxSteps; step += 1) {
      const point = add(origin, mul(direction, travel));
      const distance = sceneDistance(point, options);

      if (distance < epsilon) {
        return {
          hit: true,
          travel,
          steps: step + 1,
          point,
        };
      }

      travel += distance;
      if (travel > maxDistance) {
        return {
          hit: false,
          travel,
          steps: step + 1,
          point,
        };
      }
    }

    return {
      hit: false,
      travel,
      steps: maxSteps,
      point: add(origin, mul(direction, travel)),
    };
  }

  function softShadow(point, lightDirection, options) {
    let result = 1;
    let travel = 0.025;

    for (let index = 0; index < 24; index += 1) {
      const sample = add(point, mul(lightDirection, travel));
      const h = sceneDistance(sample, options);
      if (h < 0.001) return 0.15;
      result = Math.min(result, 12 * h / travel);
      travel += clamp(h, 0.012, 0.18);
      if (travel > 3.2) break;
    }

    return clamp(result, 0.15, 1);
  }

  function shade(trace, direction, options) {
    if (!trace.hit) {
      const t = clamp(0.5 + direction.y * 0.5, 0, 1);
      return [
        Math.round(10 + t * 58),
        Math.round(17 + t * 72),
        Math.round(28 + t * 104),
      ];
    }

    const normal = estimateNormal(trace.point, options);
    const lightDirection = normalize(vec3(-0.55, 0.78, 0.42));
    const diffuse = clamp(dot(normal, lightDirection), 0, 1);
    const shadow = softShadow(add(trace.point, mul(normal, 0.01)), lightDirection, options);
    const rim = Math.pow(clamp(1 - Math.abs(dot(normal, mul(direction, -1))), 0, 1), 2.2);
    const ao = clamp(1 - trace.steps / (options.maxSteps || 86) * 0.55, 0.35, 1);
    const intensity = (0.18 + diffuse * shadow * 0.78 + rim * 0.25) * ao;

    return [
      Math.round(clamp(255 * intensity, 0, 255)),
      Math.round(clamp(214 * intensity + rim * 22, 0, 255)),
      Math.round(clamp(125 * intensity + diffuse * 36, 0, 255)),
    ];
  }

  function cameraRay(x, y, width, height, options = {}) {
    const aspect = width / height;
    const fov = Number(options.fov || 1.05);
    const px = (2 * (x + 0.5) / width - 1) * aspect * fov;
    const py = (1 - 2 * (y + 0.5) / height) * fov;
    const origin = vec3(0, 0.15, 2.9);
    const direction = normalize(vec3(px, py - 0.05, -1.65));
    return { origin, direction };
  }

  function render(options = {}) {
    const width = clamp(Math.round(options.width || 192), 32, 420);
    const height = clamp(Math.round(options.height || 108), 24, 260);
    const pixels = new Uint8ClampedArray(width * height * 4);
    let hits = 0;
    let stepTotal = 0;
    let maxStepsSeen = 0;
    let energy = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const ray = cameraRay(x, y, width, height, options);
        const trace = traceRay(ray.origin, ray.direction, options);
        const color = shade(trace, ray.direction, options);
        const offset = (y * width + x) * 4;

        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        pixels[offset + 3] = 255;

        hits += trace.hit ? 1 : 0;
        stepTotal += trace.steps;
        maxStepsSeen = Math.max(maxStepsSeen, trace.steps);
        energy += color[0] + color[1] + color[2];
      }
    }

    const pixelCount = width * height;
    return {
      width,
      height,
      pixels,
      metrics: {
        pixelCount,
        hitRatio: hits / pixelCount,
        averageSteps: stepTotal / pixelCount,
        maxSteps: maxStepsSeen,
        colorEnergy: energy / pixelCount,
      },
    };
  }

  function benchmarkRender(options = {}) {
    const iterations = clamp(Math.round(options.iterations || 5), 1, 40);
    const started = Date.now();
    let frame = null;

    for (let index = 0; index < iterations; index += 1) {
      frame = render({
        ...options,
        time: Number(options.time || 0) + index * 0.03,
      });
    }

    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: frame ? frame.metrics : null,
    };
  }

  const api = {
    benchmarkRender,
    cameraRay,
    estimateNormal,
    render,
    sceneDistance,
    shade,
    traceRay,
  };

  global.SdfCore = api;
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
