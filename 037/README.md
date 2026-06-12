# 037 - Ear Clipping Triangulator

Vanilla JavaScript ear clipping triangulator with deterministic concave polygons, orientation correction, point-in-triangle tests, area preservation checks, Canvas 2D mesh rendering, benchmark mode, and JSON export.

## What It Does

- Generates deterministic concave polygons with stable vertex ordering.
- Triangulates them with ear clipping and point-in-triangle rejection.
- Reports triangle count, expected triangle count, polygon area, triangle area, and area error.

## Validation

From the repository root:

```bash
npm run test:037
npm run smoke:projects
```
