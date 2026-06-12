# 044 - Quadtree Range Query

Vanilla JavaScript quadtree range-query engine with deterministic spatial points, subdivision, rectangular queries, brute-force verification, Canvas 2D index rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Builds a quadtree over deterministic 2D points.
- Runs rectangular range queries while counting visited nodes.
- Verifies every query against a brute-force scan.

## Validation

From the repository root:

```bash
node scripts/test-project-044.js
npm run test:projects
npm run smoke:projects
```
