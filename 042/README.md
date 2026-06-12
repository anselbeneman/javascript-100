# 042 - Particle Swarm Optimizer

Vanilla JavaScript particle swarm optimizer with deterministic particles, Rosenbrock and Rastrigin objective functions, velocity updates, convergence tracking, Canvas 2D search rendering, benchmark mode, and JSON export.

## What It Does

- Initializes a deterministic swarm over a bounded 2D search space.
- Updates velocity with inertia, cognitive, and social components.
- Reports best score, best coordinates, iterations, particles, and improvement ratio.

## Validation

From the repository root:

```bash
node scripts/test-project-042.js
npm run test:projects
npm run smoke:projects
```
