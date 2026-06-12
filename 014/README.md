# 014 - Kalman Filter Lab

Vanilla JavaScript sensor fusion studio built around a constant-velocity Kalman filter.

## What it demonstrates

- Deterministic motion simulation with noisy measurements.
- Predict/update Kalman filtering with covariance tracking.
- Canvas 2D rendering for truth, measurements, filtered path, and uncertainty ellipses.
- RMSE comparison, improvement percentage, residual diagnostics, and final gain.
- Benchmark timing, JSON export, PNG capture, and technical report copy.

## Files

- `kalman-core.js` contains the simulation, filter, RMSE, and benchmark logic.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:014
npm run smoke:projects
```
