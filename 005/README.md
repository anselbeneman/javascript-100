# 005 - Procedural Terrain Generator

Standalone vanilla JavaScript terrain generator built with Canvas 2D, Web Workers, deterministic noise, domain warping, erosion-style smoothing, biome coloring, contour overlays, and export tools.

## What It Does

- Generates deterministic terrain from a text seed.
- Uses fractal value noise for base landforms and moisture fields.
- Applies domain warping so coastlines and mountain ranges avoid grid-like repetition.
- Blends ridged noise into the height field for sharper peaks.
- Applies lightweight thermal erosion passes to soften unrealistic cliffs.
- Classifies each cell into water, beach, grassland, forest, rock, snow, desert, canyon, or river-biased regions.
- Computes slope from neighboring height samples and uses it for lighting and diagnostics.
- Supports alpine, island, canyon, and glacial presets.
- Provides controls for grid size, terrain scale, sea level, relief, erosion, warp, octave count, and river overlay strength.
- Renders optional contour lines and hillshade.
- Shows land coverage, peak count, render time, seed fingerprint, and pointer sample diagnostics.
- Exports the current map as PNG and copies the reproducible configuration as JSON.
- Supports keyboard commands for generate, randomize seed, and PNG export without taking over form controls.

## Architecture

```text
index.html         Tool markup, controls, metrics, and Canvas viewport
style.css          Responsive studio UI
terrain-core.js    Deterministic terrain math, noise, erosion, biomes, colors, and render pipeline
terrain-worker.js  Worker wrapper around the render pipeline
main.js            UI state, worker orchestration, canvas presentation, sampling, presets, and export actions
project.json       Hub metadata
```

`terrain-core.js` is independent from the DOM. It normalizes configuration, hashes seeds, generates typed-array height and moisture maps, applies the terrain pipeline, renders pixels, and exposes helpers used by both the main thread and the worker. `terrain-worker.js` keeps generation work away from the UI thread. `main.js` owns controls, status, Canvas presentation, pointer sampling, exports, and keyboard commands.

## Terrain Pipeline

1. Normalize the requested project settings.
2. Hash the seed into a deterministic 32-bit value.
3. Generate warped coordinate fields.
4. Combine fractal base noise, ridged mountain noise, and fine detail.
5. Apply optional island falloff from the active preset.
6. Normalize the height field.
7. Run thermal erosion passes based on the erosion control.
8. Generate a moisture field and derive river potential.
9. Compute slope from neighboring height samples.
10. Classify biomes and color each cell.
11. Apply hillshade and optional contour overlays.
12. Return pixels, terrain arrays, and render statistics to the main thread.

## Technical Signals

- Keeps the project standalone with no bundler or project-local dependencies.
- Uses typed arrays for dense map data instead of object-heavy per-cell records.
- Runs generation in a Web Worker so high-resolution maps do not freeze controls.
- Separates deterministic terrain math from browser UI orchestration.
- Uses seed hashing and pure noise helpers so presets can be reproduced exactly.
- Computes diagnostic values from the same generated map shown on Canvas.
- Uses the Canvas export path directly from the generated image rather than a separate preview-only asset.

## Validation

From the repository root:

```bash
pnpm run validate
```
