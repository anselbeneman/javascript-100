# 003 - Particle Physics Sandbox

Standalone vanilla JavaScript particle physics sandbox built with Canvas 2D, a deterministic simulation core, spatial-grid collision detection, pointer forces, presets, import/export tooling, deterministic benchmarks, technical reports, and live performance metrics.

## What It Does

- Simulates hundreds of particles with velocity, mass, radius, wall collisions, drag, restitution, gravity, center attraction, swirl forces, and pointer forces.
- Uses a spatial grid so particle-particle collision checks scale by nearby buckets instead of every possible pair.
- Provides four presets: orbit field, granular fall, fountain lab, and magnetic swarm.
- Includes pause, reset, randomize, center burst, preset, pointer mode, particle count, radius, gravity, drag, bounce, pointer force, collision, trail, and grid controls.
- Tracks FPS, particle count, average kinetic energy, simulation step time, collision checks, collision hits, occupied grid cells, spread, status, and seed.
- Exports reproducible JSON snapshots with seed, settings, metrics, benchmark data, and a deterministic fingerprint.
- Imports previous snapshots and supports hash-based share links for repeatable demos.
- Runs a deterministic benchmark path that reports average, median, P95, worst frame cost, stability score, average checks, collision totals, and final energy.
- Generates a technical Markdown report from the current simulation state.
- Supports pointer input for attraction, repulsion, stirring, and burst spawning.
- Supports keyboard commands for pause, reset, randomize, center burst, and benchmark.
- Keeps the physics model in a pure helper file so deterministic behavior can be tested outside the browser UI.

## Architecture

```text
index.html       Tool markup, controls, metrics, and Canvas surface
style.css        Responsive sandbox UI
physics-core.js  Deterministic particle model, forces, spatial grid, collisions, metrics, and burst helper
analysis-tools.js Pure snapshot, share-link, benchmark, fingerprint, and report helpers
main.js          Canvas rendering, controls, pointer input, keyboard input, resize handling, import/export, and live metrics
project.json     Hub metadata
```

`physics-core.js` exposes `window.ParticlePhysicsCore`. The core owns preset normalization, seeded random generation, particle creation, world resizing, spatial-grid construction, collision resolution, burst spawning, time stepping, and metrics. `analysis-tools.js` exposes `window.ParticlePhysicsTools` and owns JSON snapshots, share hashes, fingerprints, deterministic benchmarks, and Markdown report generation without touching the DOM. `main.js` coordinates browser state: controls, Canvas drawing, pointer events, keyboard commands, responsive sizing, import/export, and status labels.

## Simulation Model

Each particle stores position, velocity, radius, mass, hue, and heat. Every step applies preset forces, pointer forces, exponential drag, velocity integration, wall constraints, optional grid-based particle collisions, and metrics collection.

The collision pass builds buckets from particle positions with a cell size tied to particle radius. It only checks particles in the current and neighboring cells, then resolves overlap and applies an impulse using each particle mass and the selected restitution value. This keeps the simulation interactive at desktop and laptop sizes while still showing real collision pressure.

## Technical Signals

- Uses deterministic seeded world generation so presets can be reproduced and tested.
- Separates physics from UI for easier audit and direct unit tests.
- Separates import/export, reports, share links, and benchmarks from both the renderer and the solver.
- Uses spatial hashing instead of naive all-pairs collision checks.
- Tracks collision checks and hits so performance cost is visible.
- Provides benchmark P95 and stability metrics instead of only instant FPS.
- Adds deterministic fingerprints so exported states can be compared.
- Measures simulation step time separately from frame rendering.
- Handles device-pixel-ratio resizing while preserving world positions.
- Keeps all runtime assets inside the numbered folder with no bundler or project-local dependencies.

## Controls

- `Space`: pause or resume.
- `R`: reset the current world.
- `X`: randomize the seed.
- `B`: spawn a burst at the center.
- `M`: run the deterministic benchmark.
- Pointer down on the canvas spawns a burst and applies the selected pointer force.

## Validation

From the repository root:

```bash
pnpm run validate
```
