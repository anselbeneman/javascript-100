# 063 - Bezier Subdivision Studio

Vanilla JavaScript Bezier subdivision studio with De Casteljau evaluation, deterministic control points, curve-length telemetry, Canvas 2D curve rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Evaluates a cubic Bezier curve with De Casteljau.
- Samples curve points and link geometry.
- Verifies endpoints against control points.

## Validation

From the repository root:

```bash
node scripts/test-project-063.js
npm run test:projects
npm run smoke:projects
```
