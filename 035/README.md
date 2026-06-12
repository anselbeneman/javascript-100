# 035 - K-Means Color Quantizer

Vanilla JavaScript K-means color quantizer with deterministic RGB sample clouds, centroid updates, inertia tracking, palette extraction, Canvas 2D cluster rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Generates deterministic RGB sample clouds around palette centers.
- Runs K-means assignment and centroid updates with inertia history.
- Reports sample count, cluster count, final inertia, empty clusters, and improvement ratio.

## Validation

From the repository root:

```bash
npm run test:035
npm run smoke:projects
```
