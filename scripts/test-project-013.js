const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const corePath = path.join(rootDir, '013', 'mesh-core.js');

function fail(message) {
  throw new Error(message);
}

function loadCore() {
  const context = vm.createContext({ window: {}, Math, Date });
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), context, {
    filename: path.relative(rootDir, corePath),
  });
  return context.window.MeshCore;
}

const MeshCore = loadCore();
const meshA = MeshCore.createMesh({
  count: 72,
  spread: 0.88,
  jitter: 0.26,
  seed: 1301,
});
const meshB = MeshCore.createMesh({
  count: 72,
  spread: 0.88,
  jitter: 0.26,
  seed: 1301,
});

if (JSON.stringify(meshA.triangles) !== JSON.stringify(meshB.triangles)) {
  fail('Delaunay triangulation should be deterministic for the same seed');
}

if (meshA.points.length !== 72) {
  fail(`Expected 72 points, received ${meshA.points.length}`);
}

if (meshA.triangles.length < 95) {
  fail(`Expected a non-trivial triangulation, received ${meshA.triangles.length} triangles`);
}

meshA.triangles.forEach((triangle, index) => {
  ['a', 'b', 'c'].forEach((key) => {
    const pointIndex = triangle[key];
    if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= meshA.points.length) {
      fail(`Triangle ${index} contains invalid point index ${pointIndex}`);
    }
  });
});

['triangleCount', 'edgeCount', 'averageArea', 'coverageArea', 'minAngle', 'maxCircumradius'].forEach((metric) => {
  const value = meshA.stats[metric];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Mesh metric ${metric} must be finite`);
  }
});

if (meshA.stats.minAngle <= 0 || meshA.stats.coverageArea <= 0.1) {
  fail('Mesh metrics indicate an invalid geometry result');
}

console.log(`Project 013 test passed: ${meshA.points.length} points, ${meshA.triangles.length} triangles, min angle ${meshA.stats.minAngle.toFixed(2)} deg`);
