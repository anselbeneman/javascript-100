# 015 - Genetic Route Optimizer

Vanilla JavaScript evolutionary optimization studio for traveling-salesperson style route search.

## What it demonstrates

- Deterministic city generation and route scoring.
- Tournament selection, ordered crossover, swap mutation, inversion mutation, and elitism.
- Canvas 2D rendering for optimized route, nearest-neighbor baseline, city map, and convergence curve.
- Improvement metrics, baseline comparison, benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `genetic-core.js` contains the city generation, route scoring, genetic operators, and benchmark logic.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:015
npm run smoke:projects
```
