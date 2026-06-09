# 009 - Inverse Kinematics Studio

Vanilla JavaScript inverse kinematics studio with Canvas 2D rendering, FABRIK and CCD solvers, articulated multi-chain rigs, joint limit controls, obstacle avoidance, pointer targets, deterministic presets, live diagnostics, benchmark timing, JSON export, technical report copy, and PNG capture.

## What It Does

- Solves articulated chains against a moving or pointer-driven target.
- Compares FABRIK and CCD solver behavior with the same scene state.
- Applies optional joint clamps and obstacle repulsion after each solve pass.
- Renders reach envelopes, joints, end effectors, target trails, and collision obstacles.
- Compares FABRIK and CCD in a deterministic benchmark run.
- Exports reproducible JSON state, PNG captures, and a technical report summary.

## Technical Notes

The project keeps the solver logic in `ik-core.js` and the browser presentation in `main.js`. Each animation frame builds a solver settings object from the controls, updates the target mode, solves every chain, and renders a full diagnostic frame. The benchmark runs deterministic target samples through both FABRIK and CCD, then reports average solve time, average error, and iteration pressure.

## Test Coverage

`scripts/test-project-009.js` validates deterministic rig generation, solver error reduction, finite diagnostics, segment-length preservation after constraints, and full extension behavior when a target is outside chain reach.

## Validation

From the repository root:

```bash
pnpm run verify:projects
pnpm run test:009
pnpm run smoke:projects
```
