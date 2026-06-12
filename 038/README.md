# 038 - Topological Scheduler

Vanilla JavaScript topological scheduler with deterministic DAG generation, Kahn ordering, cycle checks, critical-path timing, Canvas 2D dependency rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Generates deterministic acyclic dependency graphs.
- Sorts tasks with Kahn's algorithm and validates dependency order.
- Computes critical path duration using earliest start propagation over the DAG.

## Validation

From the repository root:

```bash
npm run test:038
npm run smoke:projects
```
