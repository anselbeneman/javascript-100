# JavaScript 100

[![CI](https://github.com/anselbeneman/javascript-100/actions/workflows/ci.yml/badge.svg)](https://github.com/anselbeneman/javascript-100/actions/workflows/ci.yml)

JavaScript 100 is a portfolio hub for standalone HTML, CSS, and JavaScript projects.

The React app is only the viewer. The actual exercises live as independent numbered projects at the repository root.

See [CONTRIBUTING.md](CONTRIBUTING.md) for project rules, validation expectations, and commit style. See [SECURITY.md](SECURITY.md) for safe reporting guidelines.

## Structure

```text
001/                  Ray Tracing Studio
NNN/                  Additional standalone project folders when published
public/               Static shell assets
public/projects/      Generated iframe copy, do not edit directly
schemas/              JSON Schemas for project metadata
scripts/              Build and sync helpers
src/hub/              React hub and project viewer
```

Each numbered project must include:

```text
index.html
project.json
```

Optional assets such as `style.css`, `main.js`, images, and data files stay inside the same numbered folder.

Numbered projects are standalone browser projects. Do not add project-level package managers, bundler configs, or `node_modules` inside project folders.

Each project `index.html` must define a responsive viewport, a JavaScript-focused meta description, and a title that includes both the project id and project name.

Each `project.json` also declares `status`, `difficulty`, and `tech` metadata so the hub can show fast portfolio signals. Include `"$schema": "../schemas/project.schema.json"` for editor autocomplete and validation.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run create:project
pnpm run icons:generate
pnpm run sync:projects
pnpm run verify:github
pnpm run verify:projects
pnpm run test:001
pnpm run smoke:projects
pnpm run budget:build
pnpm run preview
pnpm run preview:check
pnpm run validate
```

`sync:projects` reads every root folder with a three-digit project id. It copies the runnable files into `public/projects/` and rebuilds `public/projects.json`. The hub can run with zero published projects while a project is being built privately.

## Quality Gate

Before publishing changes, run:

```bash
pnpm run validate
```

This syncs generated project assets, verifies GitHub repository config, verifies the project registry, runs dedicated tests for published project internals, checks standalone JavaScript syntax, smoke tests project workers, validates hub SEO/social metadata, validates public discovery files, validates each project HTML metadata, checks DOM ids/selectors referenced by project scripts, confirms generated public copies match their source folders, confirms numbered projects stay standalone, builds the production bundle, checks the bundle size budget, and smoke tests production preview routes. GitHub Actions runs the same gate on pushes and pull requests.

The hub bundle budget is intentionally small because numbered projects are standalone iframe assets. Current limits are 96 KiB gzip JavaScript, 10 KiB gzip CSS, and 110 KiB gzip combined static JS/CSS.

Dependabot checks npm dependencies and GitHub Actions weekly so maintenance stays visible without manual tracking. CodeQL scans JavaScript and GitHub Actions with the security-and-quality query suite.

## Deployment

`vercel.json` keeps direct project viewer URLs stable in production. It rewrites `/project/*` to the React hub while leaving `/projects/*`, `/projects.json`, social images, and other static assets as real files.

`postbuild` writes `build/404.html` from the production `index.html` so static hosts such as GitHub Pages can fall back to the React viewer for direct project routes. `public/.nojekyll` disables Jekyll processing when the build is served from GitHub Pages.

The React router also includes an internal wildcard 404 route so unknown paths render a controlled return-to-hub screen instead of a blank page.

The public folder also includes `robots.txt`, `sitemap.xml`, PNG install icons, and `site.webmanifest` so browsers, crawlers, and link preview tools have explicit production metadata.

Production responses use explicit security headers, including a self-hosted Content Security Policy that permits local scripts, styles, images, workers, and same-origin project iframes while blocking remote code by default.

## Projects

### 001 - Ray Tracing Studio

Vanilla JavaScript path tracing studio with Canvas 2D rendering, Web Worker tile rendering, pure JS render/canvas presenter cores, progressive sample accumulation, adaptive tile variance, ray-sphere and ray-plane intersections, diffuse, metal, glass, and emissive materials, checker surfaces, depth of field, ACES tone mapping, direct lighting, preview denoise, viewport-fit controls, quality profiles, live ETA/ray metrics, pause/resume, unit-tested math/render helpers, and PNG/JSON export.

## License

MIT. See [LICENSE](LICENSE).

## Add A Project

1. Create a three-digit numbered folder.
2. Add `index.html`.
3. Add `project.json` with a matching `"id"`.
4. Run `pnpm run sync:projects`.
5. Run `pnpm run build`.

Or scaffold the next project:

```bash
pnpm run create:project -- --title "Project Name" --description "Vanilla JavaScript project description with enough technical detail..." --category "Category" --yes
```
