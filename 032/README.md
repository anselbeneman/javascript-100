# 032 - FFT Spectrum Analyzer

Vanilla JavaScript FFT spectrum analyzer with generated audio signals, iterative Cooley-Tukey transform, windowing, dominant-frequency detection, Canvas 2D waveform and spectrum rendering, benchmark mode, and JSON export.

## What It Does

- Generates deterministic mixed-frequency signals without external audio assets.
- Runs an iterative Cooley-Tukey FFT with Hann windowing.
- Reports sample count, bin count, RMS, peak magnitude, and dominant frequencies.

## Validation

From the repository root:

```bash
npm run test:032
npm run smoke:projects
```
