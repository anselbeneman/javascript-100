# 059 - Edit Distance Matrix

Vanilla JavaScript edit distance matrix with dynamic-programming table construction, substitution and insertion costs, final-row telemetry, Canvas 2D matrix rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Computes Levenshtein distance with a DP matrix.
- Exposes final-row matrix telemetry.
- Verifies identity distance is zero.

## Validation

From the repository root:

```bash
node scripts/test-project-059.js
npm run test:projects
npm run smoke:projects
```
