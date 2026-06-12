# 018 - Wave Equation Lab

Vanilla JavaScript numerical simulation studio built around a finite-difference 2D wave equation solver.

## What it demonstrates

- Typed-array buffers for previous, current, and next wave states.
- Deterministic pulse injection and obstacle masks.
- Finite-difference wave propagation with speed and damping controls.
- Canvas 2D heatmap rendering with optional obstacle and energy trace overlays.
- Energy, amplitude, active-cell diagnostics, benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `wave-core.js` contains the field buffers, solver step, pulse injection, diagnostics, and benchmarking.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:018
npm run smoke:projects
```
