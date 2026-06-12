# 013 - Delaunay Mesh Lab

Vanilla JavaScript computational geometry studio built around Bowyer-Watson Delaunay triangulation.

## What it demonstrates

- Deterministic seeded point field generation.
- Delaunay triangulation without external geometry libraries.
- Canvas 2D rendering for triangles, points, and optional circumcircles.
- Topology metrics for points, edges, triangle count, coverage, minimum angle, and Euler residual.
- Benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `mesh-core.js` contains the triangulation, statistics, and benchmark logic.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:013
npm run smoke:projects
```
