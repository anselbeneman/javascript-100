# 012 - Granular Synth Lab

Vanilla JavaScript granular synthesis laboratory with Canvas 2D waveform and spectrum rendering, Web Audio API playback, deterministic wavetable generation, grain scheduling, ADSR-style envelopes, modulation controls, offline analysis metrics, benchmark timing, JSON export, technical report copy, and PNG capture.

## What It Does

- Generates deterministic stereo granular audio buffers from seed, preset, density, grain size, pitch spread, and wavetable texture.
- Visualizes waveform, grain schedule, and a compact spectrum estimate on Canvas.
- Plays rendered buffers through the Web Audio API when the user presses play.
- Reports RMS, peak, crest factor, zero-crossing rate, grain count, duration, and render benchmarks.
- Exports reproducible JSON settings and metrics, PNG captures, and a technical report.

## Technical Notes

`synth-core.js` owns the DSP layer: deterministic RNG, wavetable generation, grain scheduling, Hann-style grain envelopes, stereo panning, offline buffer rendering, signal analysis, spectrum estimation, and render summaries. `main.js` owns controls, Web Audio playback, Canvas visualization, benchmarking, and export tools.

## Test Coverage

`scripts/test-project-012.js` validates deterministic grain scheduling, bounded wavetable generation, offline render metrics, spectrum normalization, benchmark-safe summaries, and preset behavior.

## Validation

From the repository root:

```bash
pnpm run verify:projects
pnpm run test:012
pnpm run smoke:projects
```
