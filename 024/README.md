# 024 - Exact Cover Sudoku

Vanilla JavaScript exact-cover Sudoku solver using Algorithm X.

## What it demonstrates

- Sudoku encoded as 324 exact-cover constraints.
- Candidate row generation for cell, row-digit, column-digit, and box-digit constraints.
- Backtracking search with minimum-column branching.
- Canvas 2D board rendering with givens and solved values.
- Search diagnostics, benchmark timing, JSON export, PNG capture, and technical report copy.

## Validation

```bash
npm run test:024
npm run smoke:projects
```
