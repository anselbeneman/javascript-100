# 041 - Convex Hull Workbench

Vanilla JavaScript convex hull workbench with deterministic point clouds, monotonic-chain hull construction, orientation tests, area and perimeter metrics, Canvas 2D geometry rendering, benchmark mode, and JSON export.

## What It Does

- Generates deterministic 2D point clouds.
- Builds a convex hull with monotonic-chain orientation tests.
- Reports hull size, area, perimeter, and whether every point is inside the hull.

## Validation

From the repository root:

```bash
node scripts/test-project-041.js
npm run test:projects
npm run smoke:projects
```
