# JavaScript 100

JavaScript 100 is a portfolio hub for standalone HTML, CSS, and JavaScript projects.

The React app is only the viewer. The actual exercises live as independent numbered projects at the repository root.

## Structure

```text
001/                  First standalone project, when available
002/                  Second standalone project, when available
public/               Static shell assets
public/projects/      Generated iframe copy, do not edit directly
scripts/              Build and sync helpers
src/hub/              React hub and project viewer
```

Each numbered project must include:

```text
index.html
project.json
```

Optional assets such as `style.css`, `main.js`, images, and data files stay inside the same numbered folder.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run sync:projects
```

`sync:projects` reads every root folder matching `001`, `002`, `003`, and so on. It copies the runnable files into `public/projects/` and rebuilds `public/projects.json`. The hub can run with zero published projects while the next project is being built.

## Add A Project

1. Create the next numbered folder, for example `001/`.
2. Add `001/index.html`.
3. Add `001/project.json` with matching `"id": "001"`.
4. Run `pnpm run sync:projects`.
5. Run `pnpm run build`.
