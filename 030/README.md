# 030 - Marching Squares Lab

Vanilla JavaScript Marching Squares lab with procedural scalar fields, interpolated contour extraction, ambiguous-cell handling, Canvas 2D visualization, topology metrics, benchmark mode, and JSON export.

## What It Does

- Generates a procedural scalar field from waves, ridges, and a central island.
- Extracts contour segments using the 16 Marching Squares cases.
- Tracks topology metrics such as ambiguous cells, active ratio, and segment count.

## Validation

From the repository root:

```bash
npm run test:030
npm run smoke:projects
```
