# 011 - Bytecode VM Studio

Vanilla JavaScript bytecode virtual machine studio with Canvas 2D visualization, a handwritten tokenizer, Pratt parser, AST compiler, stack-based bytecode VM, deterministic sample execution, source presets, live diagnostics, benchmark timing, JSON export, technical report copy, and PNG capture.

## What It Does

- Tokenizes and parses a tiny expression language with `let` and `plot` statements.
- Compiles the AST into stack-machine bytecode.
- Runs the bytecode over deterministic sample values to draw parametric output.
- Visualizes plot output, VM trace, and compiled bytecode on the canvas.
- Exports source, constants, bytecode, metrics, PNG captures, and technical reports.

## Language Example

```txt
let a = pi * 2 * t;
let r = 0.72 * cos(a * 5);
let x = cos(a) * r;
let y = sin(a) * r;
plot(x, y);
```

## Technical Notes

`compiler-core.js` owns the complete language pipeline: tokenization, Pratt parsing, AST compilation, bytecode generation, deterministic VM execution, source presets, and benchmarks. `main.js` keeps the UI layer separate, rendering the output curve, trace overlay, bytecode overlay, controls, benchmark results, and export tools.

## Test Coverage

`scripts/test-project-011.js` validates tokenization, AST generation, bytecode generation, deterministic VM execution, parser error reporting, preset compilation, and benchmark metrics.

## Validation

From the repository root:

```bash
pnpm run verify:projects
pnpm run test:011
pnpm run smoke:projects
```
