# 017 - SAT Collision Engine

Vanilla JavaScript collision detection studio built around the separating axis theorem.

## What it demonstrates

- Convex polygon body generation and transformed vertices.
- Separating axis theorem projections, overlap tests, normals, and penetration depth.
- Impulse-style collision resolution and wall bounds.
- Canvas 2D rendering for bodies, contacts, normals, bounds, and velocity vectors.
- Benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `collision-core.js` contains polygon transforms, SAT tests, resolution, simulation, and benchmarking.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:017
npm run smoke:projects
```
