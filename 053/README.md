# 053 - Tarjan SCC Explorer

Vanilla JavaScript Tarjan strongly-connected-components explorer with deterministic directed graphs, low-link tracking, component extraction, Canvas 2D graph rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Builds deterministic directed graph structures.
- Extracts strongly connected components with Tarjan low-link logic.
- Verifies that every node belongs to exactly one component.

## Validation

From the repository root:

```bash
node scripts/test-project-053.js
npm run test:projects
npm run smoke:projects
```
