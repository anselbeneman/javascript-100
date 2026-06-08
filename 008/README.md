# 008 - Audio Spectrum Visualizer

Standalone vanilla JavaScript audio spectrum visualizer built with the Web Audio API, Canvas 2D rendering, FFT analysis, generated demo synthesis, decoded local audio files, spectrogram history, beat detection, responsive controls, live metrics, visual presets, and PNG export.

## What It Does

- Renders FFT data as spectrum bars, radial spokes, waveform scope, or scrolling spectrogram.
- Shows a deterministic idle visualization before audio is unlocked.
- Generates a browser-only demo synth with oscillators and scheduled note changes.
- Decodes local audio files with `decodeAudioData`.
- Exposes FFT size, smoothing, sensitivity, volume, palette, mode, freeze, randomize, and PNG export controls.
- Tracks peak frequency, RMS level, beat intensity, FPS, and analyser bin count.

## Architecture

```text
index.html    Studio markup, controls, metrics, and Canvas stage
style.css     Responsive visualizer UI
main.js       Web Audio graph, file decoding, FFT analysis, Canvas renderers, metrics, and export
project.json  Hub metadata
```

## Technical Signals

- Uses Web Audio API primitives directly without visualization libraries.
- Groups spectrum bars across a curved frequency scale so low bands are readable.
- Computes RMS from waveform samples and beat intensity from rolling low-band energy.
- Resizes Canvas with device-pixel-ratio awareness.
- Stays standalone without bundlers, CDN scripts, or project-local dependencies.

## Validation

From the repository root:

```bash
pnpm run validate
```
