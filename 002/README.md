# 002 - Fluid Simulation Studio

Standalone vanilla JavaScript fluid simulation built with Canvas 2D, typed arrays, pointer input, diagnostic render modes, and a Web Worker solver.

## What It Does

- Simulates a two-dimensional dye field with velocity advection.
- Injects dye and directional force through pointer dragging.
- Runs pressure projection passes to reduce velocity divergence.
- Adds vorticity confinement for controllable swirling motion.
- Applies an optional solid obstacle boundary that blocks velocity and clears dye inside the obstacle.
- Precomputes obstacle solid/fade/rim masks so repeated solver and render passes avoid per-cell distance checks.
- Uses a Web Worker so the solver does not block the UI thread.
- Provides presets for neon ink, cold smoke, lava, ocean wake, and aurora wake visuals.
- Renders dye, velocity, pressure, and curl views from the same simulation state.
- Runs deterministic scripted scenarios for twin-vortex, shear-wake, and spiral-bloom demos.
- Records manual input traces, inspects their event statistics, draws the trace path over the simulation, and replays them through the same solver path for reproducible demos and debugging.
- Draws optional velocity vectors, brush-radius overlays, and replay-trace path overlays.
- Provides performance, balanced, quality, diagnostic, and custom profiles.
- Tracks rolling solver telemetry with P95 step time, estimated field memory, and performance-budget status.
- Runs a deterministic worker-side benchmark and reports average, median, P95, worst, standard deviation, stability score, and timing distribution.
- Recommends budget-aware performance tuning and can automatically lower solver cost when measured P95 exceeds the target.
- Exposes grid size, force, brush radius, dye hold, velocity hold, pressure passes, vorticity, and automatic source controls.
- Persists the latest control state locally between sessions and provides a balanced defaults action.
- Tracks FPS, simulation grid size, frame count, solver step time, max density, average divergence, and runtime status.
- Exports the current canvas as PNG, exports/imports reproducible JSON settings, copies shareable state links, and creates a technical report that copies to the clipboard or falls back to a Markdown download.
- Includes replay traces, trace analysis, deterministic trace fingerprints, and import integrity checks in JSON exports and technical reports so a reviewed configuration can carry the exact user input sequence.
- Supports keyboard commands for pause, randomize, defaults, benchmark, and scenario playback without overriding form controls.

## Architecture

```text
index.html        Tool markup, controls, diagnostics, and Canvas surface
style.css         Responsive studio UI
config-tools.js   Pure settings normalization, share-link parsing, import/export payloads, benchmark shaping, and report generation
scenario-tools.js Pure deterministic scenario definitions and splat generation
telemetry-tools.js Rolling percentile telemetry, memory estimates, performance advice, and auto-tune decisions
replay-tools.js   Pure input-trace recording, normalization, analysis, and replay scheduling
fluid-presenter.js Pure Canvas sizing, pointer normalization, splat shaping, frame presentation, and overlay drawing
browser-tools.js  Browser interaction helpers for keyboard shortcuts, clipboard fallback, and downloads
main.js           UI state, profiles, worker orchestration, trace/scenario state, and export event handling
fluid-core.js     Pure worker math, benchmark percentile summaries, histograms, obstacle masks, color parsing, clamps, and HSV conversion
fluid-state.js    Solver field allocation, clear, snapshot, restore, and index helpers for typed-array state
fluid-worker.js   Typed-array fluid solver, diagnostics, benchmark, and pixel renderer
project.json      Hub metadata
```

The main thread owns the browser UI, quality profiles, worker orchestration, benchmark commands, scenario playback, trace controls, trace inspector, and export actions. `fluid-presenter.js` owns the Canvas presentation boundary: viewport sizing, pointer-to-canvas normalization, splat shaping, scaled frame drawing, brush/vector/obstacle overlays, and replay-trace overlay drawing. `browser-tools.js` owns browser-adapter behavior that is easy to regress accidentally: keyboard shortcut routing, clipboard fallback, and Blob downloads. `config-tools.js` keeps imported settings, share-link hashes, benchmark data, replay traces, trace analysis, exported JSON, and Markdown reports normalized without touching the DOM or solver. `scenario-tools.js` generates deterministic splat streams for repeatable demos without using random state. `telemetry-tools.js` maintains rolling performance summaries, P95 solver step time, estimated field memory, budget labels, and budget-aware tuning decisions. `replay-tools.js` turns manual pointer splats into a bounded event log, computes event statistics, and schedules the trace back into the same worker input path. `fluid-core.js` isolates pure worker math, obstacle-mask precomputation, color parsing, and benchmark summary helpers. `fluid-state.js` owns typed-array field allocation, clearing, snapshotting, and restoration so the worker message adapter can be tested without treating every memory operation as hidden implementation detail. The worker owns the simulation pipeline over horizontal and vertical velocity, RGB dye channels, pressure, divergence, and curl. Each animation frame sends settings and queued splats to the worker, which advances the solver and returns a compact RGBA buffer, telemetry, and optional vector samples for the presenter to scale onto the visible Canvas.

## Simulation Pipeline

1. Apply user splats and optional automatic emitters.
2. Merge active scripted scenario splats into the same input queue.
3. Merge active replay-trace splats into that queue without a separate replay-only solver path.
4. Compute curl and apply vorticity confinement.
5. Project velocity through Jacobi pressure iterations.
6. Advect velocity through the current velocity field.
7. Project again after velocity advection.
8. Advect each dye channel with configurable dissipation.
9. Render the selected diagnostic view into an RGBA pixel buffer.
10. Return solver telemetry and optional vector samples.
11. Scale the buffer onto the responsive Canvas and draw overlays.

## Benchmark Path

The benchmark runs inside the same worker as the live solver. It snapshots the current field, clears the buffers, runs warm-up frames that are not counted, then runs a deterministic set of measured splats for a fixed number of frames. It reports average, median, P95, worst, standard deviation, stability score, and a compact timing histogram, then restores the previous field. That keeps the benchmark meaningful without destroying the user's visible simulation state.

## Technical Signals

- Keeps the simulation standalone without bundlers or project-local dependencies.
- Uses `Float32Array` buffers for dense fields instead of object-heavy cell records.
- Separates UI orchestration from solver state through worker messages.
- Implements an obstacle boundary without moving solver work back onto the main thread.
- Precomputes static obstacle masks once per grid allocation instead of recalculating geometry in every pass.
- Supports multiple render passes from one authoritative simulation state.
- Provides deterministic scenario playback as a reproducible demo path separate from pointer input.
- Records pointer splats as bounded event traces, summarizes trace pressure/travel/bounds, fingerprints the normalized trace, verifies imported trace integrity, renders the trace path as an overlay, and replays it through the same worker message contract.
- Tracks P95 solver step time instead of relying only on noisy instant-frame metrics.
- Estimates typed-array field memory from grid size so quality settings have visible cost.
- Uses stable telemetry or benchmark P95 before recommending automatic tuning, avoiding decisions from warm-up noise.
- Benchmarks deterministic worker frames with uncounted warm-up, percentile timing, timing distribution, and jitter metrics instead of only average timing.
- Keeps benchmark percentile, histogram, color parsing, and obstacle-mask math in a pure worker-core helper with direct tests.
- Snapshots and restores solver buffers for benchmarking without UI-side simulation logic.
- Keeps solver field allocation, clear, snapshot, and restore operations in a dedicated typed-array state helper with direct tests.
- Separates report and import/export shaping into a small pure helper module so the UI and solver contracts are easier to audit.
- Separates Canvas presentation and pointer normalization into a dedicated helper module so the main thread is easier to review and unit test.
- Separates keyboard, clipboard, and download browser-adapter behavior into a dedicated helper module so the UI controller has fewer low-level DOM branches.
- Encodes control state into shareable URL hashes and safely normalizes shared links on load.
- Generates a technical report from live solver state rather than hard-coded copy.
- Normalizes imported JSON before applying it to controls so shared configs cannot push sliders outside supported ranges.
- Measures divergence and step time so visual quality has numerical feedback.
- Keeps controls responsive while the worker advances the fluid field.

## Validation

From the repository root:

```bash
pnpm run validate
```

Focused project checks:

```bash
pnpm run test:002
pnpm run smoke:projects
```

`test:002` covers pure config/presenter/browser/replay/telemetry/worker-core/worker-state helpers plus the worker message contract for live frames and deterministic benchmark summaries.
