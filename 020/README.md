# 020 - Verlet Cloth Solver

Vanilla JavaScript cloth simulation studio built around Verlet integration and position-based constraints.

## What it demonstrates

- Grid cloth generation with pinned particles and structural/bending constraints.
- Verlet integration with gravity, damping, and procedural wind.
- Iterative constraint relaxation, bounds, and circular obstacle collision.
- Canvas 2D rendering for mesh, stress color, particles, obstacle, and stretch trace.
- Stretch metrics, kinetic energy, benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `cloth-core.js` contains cloth generation, integration, constraint solving, collision, metrics, and benchmarking.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:020
npm run smoke:projects
```
