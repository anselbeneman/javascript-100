# 016 - Fourier Epicycle Studio

Vanilla JavaScript Fourier analysis studio built around discrete Fourier transform coefficients and harmonic reconstruction.

## What it demonstrates

- Deterministic 2D path generation.
- Discrete Fourier transform over complex-valued paths.
- Harmonic reconstruction and epicycle chain visualization.
- Reconstruction error, dominant harmonic, compression ratio, and benchmark timing.
- JSON export, PNG capture, and technical report copy.

## Files

- `fourier-core.js` contains path generation, DFT, reconstruction, error metrics, and benchmarking.
- `main.js` binds controls, rendering, export actions, and metrics.
- `style.css` keeps the fullscreen project shell consistent with the rest of the hub.

## Validation

Run:

```bash
npm run test:016
npm run smoke:projects
```
