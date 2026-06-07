# 001 - Ray Tracing Studio

Standalone vanilla JavaScript path tracer built with Canvas 2D and Web Workers.

## What It Does

- Progressive path tracing with tiled worker rendering.
- Diffuse, metal, rough metal, glass, and emissive materials.
- Ray-sphere and ray-plane intersections with checker surfaces.
- Orbital camera with field of view, focus distance, and lens aperture.
- Depth of field through stochastic lens sampling.
- ACES filmic tone mapping with exposure and contrast controls.
- Next-event direct lighting for faster first-bounce convergence.
- Adaptive tile sampling based on luminance variance.
- Batched Canvas updates through `requestAnimationFrame`.
- Optional preview denoise after early samples.
- Viewport-fit render layout with compact collapsible controls.
- Quality profiles for preview, final, and cinematic rendering.
- Pause/resume without losing completed samples.
- PNG export plus JSON export with render metadata.

## Architecture

```text
index.html         Tool markup and controls
style.css          Responsive technical UI
main.js            UI state, worker orchestration, accumulation, export
studio-core.js     Pure JS render settings, scene presets, tiles, tone mapping
canvas-presenter.js Pure JS accumulation buffers, batched paints, preview denoise
render-core.js     Pure JS camera rays, intersections, scattering, path tracing
tracer-worker.js   Thin Web Worker adapter around render-core.js
project.json       Hub metadata
```

The main thread owns UI state, settings, adaptive tile statistics, and the worker queue. Pure helper modules build the scene, camera config, tile schedule, tone mapping, accumulation buffer, and canvas presentation. Each worker receives a tile, scene snapshot, and render config, then delegates path tracing to `render-core.js` and returns linear RGB samples, ray counts, and luminance variance. `canvas-presenter.js` merges completed tiles, denoises previews, and batches canvas paints.

## Rendering Pipeline

1. Build the scene from the selected preset.
2. Build a camera with focus distance and aperture.
3. Split the canvas into 24px tiles.
4. Dispatch tiles across up to four Web Workers.
5. Trace stochastic paths with diffuse, metal, dielectric scattering, and direct light sampling.
6. Merge tile samples into the accumulation buffer and per-pixel sample counters.
7. Skip low-variance tiles after the minimum adaptive sample threshold.
8. Apply ACES tone mapping, optional preview denoise, and gamma correction.
9. Repeat until the target sample count is reached or the image converges early.

## Validation

From the repository root:

```bash
pnpm run sync:projects
pnpm run verify:projects
pnpm run test:001
pnpm run build
```
