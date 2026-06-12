# 050 - LRU Cache Simulator

Vanilla JavaScript LRU cache simulator with deterministic access traces, recency updates, eviction telemetry, hit-rate metrics, Canvas 2D cache-size rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Simulates deterministic cache accesses and recency updates.
- Tracks hit rate, evictions, and capacity constraints.
- Renders cache occupancy over time.

## Validation

From the repository root:

```bash
node scripts/test-project-050.js
npm run test:projects
npm run smoke:projects
```
