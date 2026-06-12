# 049 - KD-Tree Nearest Neighbor

Vanilla JavaScript KD-tree nearest-neighbor lab with deterministic point clouds, median-split construction, branch pruning, brute-force verification, Canvas 2D spatial rendering, benchmark mode, and JSON export.

## What It Does

- Builds a median-split KD-tree over 2D points.
- Searches nearest neighbors with branch pruning.
- Verifies the result against brute force.

## Validation

From the repository root:

```bash
node scripts/test-project-049.js
npm run test:projects
npm run smoke:projects
```
