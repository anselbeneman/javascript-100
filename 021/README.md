# 021 - SDF Ray Marcher

Vanilla JavaScript signed-distance-field rendering studio built around CPU ray marching.

## What it demonstrates

- Procedural signed distance primitives: spheres, boxes, torus, plane, and smooth unions.
- Ray marching with step budget, hit threshold, and max distance.
- Finite-difference normals, diffuse lighting, rim light, ambient occlusion, and soft shadows.
- Canvas 2D pixel rendering with low-resolution internal render buffers.
- Hit ratio, average steps, color energy, benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `sdf-core.js` contains SDF primitives, ray tracing, shading, render buffers, and benchmarking.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:021
npm run smoke:projects
```
