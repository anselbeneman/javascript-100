# 019 - Spatial Hash Flocking

Vanilla JavaScript flocking simulation studio built around spatial hash neighbor search.

## What it demonstrates

- Deterministic boid field generation.
- Spatial hash grid for local neighbor lookup.
- Separation, alignment, cohesion, speed limiting, and wraparound boundaries.
- Canvas 2D rendering for agents, grid, and polarization trace.
- Search reduction, neighbor count, polarization, spread, benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `flock-core.js` contains the boid model, spatial hash, simulation step, metrics, and benchmark logic.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:019
npm run smoke:projects
```
