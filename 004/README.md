# 004 - Pathfinding Algorithm Lab

Standalone vanilla JavaScript pathfinding laboratory for comparing graph search strategies on deterministic weighted grids.

## Features

- Canvas 2D grid renderer with visited/frontier/path overlays.
- A Star, Dijkstra, BFS, and Greedy best-first search.
- Deterministic presets for warehouse, cavern, city, and maze-like layouts.
- Pointer editing for walls, weighted cells, start, and goal.
- Diagonal movement, weight visibility, heuristic strength, and animation speed controls.
- Live diagnostics for visited nodes, frontier, path length, path cost, turns, runtime, and density.
- PNG capture, JSON export, and technical report copy.

## Files

```text
index.html      Standalone UI shell
style.css       Responsive project layout
path-core.js    Deterministic grid generation and pathfinding engine
main.js         Canvas renderer, controls, interaction, export tools
project.json    Hub metadata
```

## Technical Notes

- Uses a binary heap priority queue for weighted graph search.
- Keeps the pathfinding engine independent from DOM and Canvas rendering.
- Uses seeded hashing so the same preset/seed produces the same obstacle and weight field.
- Runs directly in the browser with no project-level framework, bundler, or dependency.
