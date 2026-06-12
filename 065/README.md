# 065 - Streaming Heavy Hitters

Vanilla JavaScript streaming heavy-hitters lab with deterministic event streams, Misra-Gries counters, exact-count comparison, Canvas 2D counter rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Tracks candidate heavy hitters in bounded memory.
- Compares counters with exact frequencies.
- Verifies a true top item is retained.

## Validation

From the repository root:

```bash
node scripts/test-project-065.js
npm run test:projects
npm run smoke:projects
```
