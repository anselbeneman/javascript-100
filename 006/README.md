# 006 - Fractal Explorer Studio

Standalone vanilla JavaScript fractal explorer for inspecting Mandelbrot and Julia sets through a worker-backed Canvas renderer.

## Features

- Mandelbrot and Julia rendering with smooth iteration coloring.
- Web Worker pixel generation so the interface remains responsive.
- Deterministic presets for cardioid, seahorse valley, elephant valley, spiral Julia, and dendrite Julia.
- Pointer zoom, pan-free re-centering, iteration controls, resolution controls, and palette switching.
- Live metrics for render time, iteration count, zoom, center, bailout, and status.
- Benchmark timing, shareable hash state, JSON export, and PNG capture.

## Files

```text
index.html        Standalone UI shell
style.css         Responsive project layout
fractal-core.js   Pure fractal math, palettes, config normalization
fractal-worker.js Worker renderer and benchmark path
main.js           Canvas presenter, controls, zoom, export tools
project.json      Hub metadata
```

## Technical Notes

- Uses typed pixel buffers transferred from the worker.
- Uses continuous iteration counts for smoother color bands.
- Keeps math and palette logic separate from DOM event handling.
- Runs directly in the browser with no project-level framework, bundler, or dependency.
