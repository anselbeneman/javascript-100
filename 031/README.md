# 031 - Polygon Clipping Studio

Vanilla JavaScript polygon clipping studio using Sutherland-Hodgman half-plane clipping, convex clip windows, polygon area metrics, Canvas 2D visualization, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Builds deterministic star polygons and convex clipping windows.
- Clips the subject polygon against each half-plane of the clip window.
- Reports vertex counts, input/output area, and retained area ratio.

## Validation

From the repository root:

```bash
npm run test:031
npm run smoke:projects
```
