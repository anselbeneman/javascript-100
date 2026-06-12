# 045 - Simulated Annealing Route Lab

Vanilla JavaScript simulated annealing route optimizer with deterministic cities, temperature schedules, 2-opt neighbor swaps, acceptance probability telemetry, Canvas 2D route rendering, benchmark mode, and JSON export.

## What It Does

- Generates deterministic cities for a traveling-route optimization problem.
- Applies simulated annealing with 2-opt route neighbors.
- Reports initial length, best length, improvement, accepted moves, and acceptance rate.

## Validation

From the repository root:

```bash
node scripts/test-project-045.js
npm run test:projects
npm run smoke:projects
```
