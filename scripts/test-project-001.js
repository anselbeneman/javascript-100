const assert = require('assert');
const path = require('path');

const canvasPresenter = require(path.join('..', '001', 'canvas-presenter.js'));
const renderCore = require(path.join('..', '001', 'render-core.js'));
const studioCore = require(path.join('..', '001', 'studio-core.js'));

function approx(actual, expected, epsilon = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function assertFiniteVector(vector, label) {
  assert.ok(Array.isArray(vector), `${label} must be an array`);
  vector.forEach((value, index) => {
    assert.ok(Number.isFinite(value), `${label}[${index}] must be finite`);
  });
}

function testVectorMath() {
  assert.deepStrictEqual(renderCore.add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  assert.deepStrictEqual(renderCore.sub([4, 5, 6], [1, 2, 3]), [3, 3, 3]);
  assert.deepStrictEqual(renderCore.mul([1, -2, 3], 2), [2, -4, 6]);
  assert.strictEqual(renderCore.dot([1, 2, 3], [4, 5, 6]), 32);
  assert.deepStrictEqual(renderCore.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  approx(renderCore.length(renderCore.normalize([3, 0, 4])), 1);
  assert.deepStrictEqual(renderCore.reflect([1, -1, 0], [0, 1, 0]), [1, 1, 0]);
}

function testDeterministicRng() {
  const rngA = renderCore.createRng(1234);
  const rngB = renderCore.createRng(1234);
  const valuesA = [rngA(), rngA(), rngA()];
  const valuesB = [rngB(), rngB(), rngB()];

  assert.deepStrictEqual(valuesA, valuesB);
  valuesA.forEach((value) => {
    assert.ok(value >= 0 && value < 1, 'RNG values must stay inside [0, 1)');
  });
}

function testIntersections() {
  const sphereHit = renderCore.hitSphere(
    { center: [0, 0, 0], radius: 1, material: { type: 'diffuse', color: [1, 1, 1] } },
    { origin: [0, 0, -5], direction: [0, 0, 1] },
    0.001,
    100,
  );

  assert.ok(sphereHit, 'Expected ray to hit sphere');
  approx(sphereHit.t, 4);
  assert.deepStrictEqual(sphereHit.normal, [0, 0, -1]);
  assert.strictEqual(sphereHit.frontFace, true);

  const planeHit = renderCore.hitPlane(
    {
      point: [0, 0, 0],
      normal: [0, 1, 0],
      material: {
        type: 'diffuse',
        color: [1, 1, 1],
        altColor: [0, 0, 0],
        checkerScale: 2.2,
      },
    },
    { origin: [0.6, 1, 0], direction: [0, -1, 0] },
    0.001,
    100,
  );

  assert.ok(planeHit, 'Expected ray to hit checker plane');
  assert.deepStrictEqual(planeHit.material.color, [0, 0, 0]);
}

function testCameraAndSceneFactory() {
  const config = studioCore.buildRenderConfig({
    width: 64,
    height: 36,
    sample: 1,
    maxBounces: 4,
    cameraYaw: 0,
    cameraHeight: 1.4,
    fov: 38,
    focusDistance: 4.9,
    aperture: 0,
  });
  const camera = renderCore.buildCamera(config.camera);
  const ray = renderCore.getCameraRay(camera, 0.5, 0.5, renderCore.createRng(1));
  const scene = studioCore.buildScene({ preset: 'showcase', warmth: 0.35, intensity: 1.8 });

  assertFiniteVector(ray.origin, 'camera ray origin');
  assertFiniteVector(ray.direction, 'camera ray direction');
  approx(renderCore.length(ray.direction), 1);
  assert.strictEqual(scene.spheres.length, 6);
  assert.strictEqual(scene.planes.length, 1);
  assert.ok(scene.sun.intensity > 0);
}

function testStudioHelpers() {
  const tiles = studioCore.createTiles(48, 24, 24);

  assert.strictEqual(tiles.length, 2);
  assert.ok(tiles.every(tile => tile.x1 - tile.x0 <= 24 && tile.y1 - tile.y0 <= 24));
  assert.strictEqual(studioCore.formatNumber(1250), '1.3K');
  assert.strictEqual(studioCore.formatDuration(65), '1m 05s');
  assert.strictEqual(studioCore.acesFilm(-1), 0);
  assert.ok(studioCore.toByte(1, 1, 1) > studioCore.toByte(0.1, 1, 1));
}

function testTileRender() {
  const config = studioCore.buildRenderConfig({
    width: 32,
    height: 18,
    sample: 1,
    maxBounces: 4,
    cameraYaw: 0,
    cameraHeight: 1.4,
    fov: 38,
    focusDistance: 4.9,
    aperture: 0.01,
  });
  const scene = studioCore.buildScene({ preset: 'studio', warmth: 0.35, intensity: 1.8 });
  const tile = { x0: 12, y0: 6, x1: 16, y1: 10 };
  const result = renderCore.renderTile({
    type: 'render',
    jobId: 1,
    tile,
    config,
    scene,
  });

  assert.ok(result, 'Tile render should return a payload');
  assert.strictEqual(result.type, 'tile');
  assert.strictEqual(result.pixels.length, 4 * 4 * 3);
  assert.ok(result.pixels instanceof Float32Array);
  assert.ok(result.rays > 0);
  assert.ok(Number.isFinite(result.mean));
  assert.ok(Number.isFinite(result.variance));

  let energy = 0;
  result.pixels.forEach((value) => {
    assert.ok(Number.isFinite(value), 'Rendered pixel values must be finite');
    assert.ok(value >= 0, 'Rendered pixel values must not be negative');
    energy += value;
  });
  assert.ok(energy > 0, 'Rendered tile must contain visible energy');

  const cancelled = renderCore.renderTile({
    type: 'render',
    jobId: 2,
    tile,
    config,
    scene,
  }, { shouldCancel: jobId => jobId === 2 });
  assert.strictEqual(cancelled, null);
}

function createFakeCanvasContext() {
  const calls = [];

  return {
    calls,
    fillStyle: '',
    createImageData(width, height) {
      return {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      };
    },
    fillRect(x, y, width, height) {
      calls.push({ method: 'fillRect', x, y, width, height });
    },
    putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
      calls.push({
        method: 'putImageData',
        width: imageData.width,
        height: imageData.height,
        dx,
        dy,
        dirtyX,
        dirtyY,
        dirtyWidth,
        dirtyHeight,
      });
    },
  };
}

function testCanvasPresenter() {
  const context = createFakeCanvasContext();
  const presenter = canvasPresenter.createCanvasPresenter({
    context,
    toByte: studioCore.toByte,
    requestFrame: callback => {
      callback();
      return 1;
    },
  });
  const tile = { x0: 0, y0: 0, x1: 2, y1: 1 };

  presenter.reset(2, 2);
  presenter.mergeTile(tile, new Float32Array([
    1, 0, 0,
    0, 1, 0,
  ]));
  presenter.drawTile(tile, {
    exposure: 1,
    contrast: 1,
    denoiseEnabled: false,
    sample: 1,
  });
  presenter.drawAccumulation({
    exposure: 1,
    contrast: 1,
    denoiseEnabled: false,
    sample: 1,
  });

  assert.strictEqual(presenter.getSampleCount(0), 1);
  assert.strictEqual(presenter.getSampleCount(1), 1);
  assert.ok(context.calls.some(call => call.method === 'fillRect'));
  assert.ok(context.calls.some(call => call.method === 'putImageData' && call.dirtyWidth === 2 && call.dirtyHeight === 1));
  assert.ok(context.calls.some(call => call.method === 'putImageData' && call.dirtyWidth === undefined));
  assert.strictEqual(canvasPresenter.byteLuminance(new Uint8ClampedArray([255, 0, 0]), 0), 255 * 0.2126);
}

testVectorMath();
testDeterministicRng();
testIntersections();
testCameraAndSceneFactory();
testStudioHelpers();
testTileRender();
testCanvasPresenter();

console.log('Project 001 unit tests passed');
