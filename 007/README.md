# 007 - Cellular Automata Lab

Standalone vanilla JavaScript cellular automata lab built with Canvas 2D, a Web Worker simulation loop, typed arrays, editable life-like rules, pointer painting, and export tools.

## What It Does

- Runs Conway Life, HighLife, Day And Night, Brian's Brain, and cyclic-wave automata.
- Supports editable `B.../S...` life-like rules.
- Keeps simulation state in `Uint8Array` buffers.
- Steps the grid in a Web Worker so UI controls stay responsive.
- Lets the user pause, step, randomize, clear, draw, erase, toggle, and cycle cells.
- Reports generation, active cells, coverage, changed cells, entropy, and measured step time.
- Renders the state directly into Canvas `ImageData`.
- Exports PNG screenshots and compact run-length encoded JSON state.

## Validation

From the repository root:

```bash
pnpm run test:007
pnpm run validate
```
