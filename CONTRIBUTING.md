# Contributing

JavaScript 100 is organized as a public portfolio of standalone browser projects. Keep every change small, verifiable, and aligned with that structure.

## Project Rules

- Root folders named with three-digit ids are standalone HTML/CSS/JavaScript projects.
- Do not add project-level package managers, bundlers, `node_modules`, or framework configs inside numbered project folders.
- Edit source projects in their root numbered folders, not in `public/projects/`.
- Treat `public/projects/` and `public/projects.json` as generated output from `scripts/sync-projects.js`.
- Publish a project by adding its id to `scripts/project-registry.js` and adding a `.published` marker; local numbered folders are not public until both are present.
- Each project needs `index.html`, `project.json`, and `README.md`.
- Each `project.json` must include `"$schema": "../schemas/project.schema.json"`.
- Each project `index.html` needs a responsive viewport, a JavaScript-focused meta description, and a title containing both the project id and project name.

## Add A Project

1. Create the next numbered folder.
2. Add `index.html`, `project.json`, and `README.md`.
3. Keep all project-specific assets inside that same folder.
4. Add a `.published` marker and add the id to `scripts/project-registry.js` only when the project is ready to be public.
5. Run `pnpm run sync:projects`.
6. Run `pnpm run validate`.

Run `pnpm run icons:generate` if the public app icon needs to be regenerated.

You can also scaffold the next project:

```bash
pnpm run create:project -- --title "Project Name" --description "Vanilla JavaScript project description with enough technical detail." --category "Category" --yes
```

## Quality Gate

Before opening a pull request or publishing changes, run:

```bash
pnpm run validate
```

The gate syncs generated assets, verifies GitHub repository config, verifies project metadata, checks standalone JavaScript syntax, validates DOM ids/selectors used by project scripts, smoke tests project runtime behavior, builds the production bundle, checks the bundle size budget, and smoke tests production preview routes.

Do not remove the `postbuild` static fallback step or `public/.nojekyll`. They keep direct viewer routes stable on static hosts such as GitHub Pages.

## Issues

Use the GitHub issue forms for bugs, project proposals, and focused questions. A good issue names the affected project or route, explains the expected behavior, and includes reproduction steps when something is broken.

## Dependency Maintenance

Dependabot checks npm dependencies and GitHub Actions weekly. Treat dependency PRs like normal code changes: review the diff, run `pnpm run validate`, and keep updates focused instead of mixing them with feature work.

## Commit Style

Use focused commits with clear intent:

```text
feat: add published project
fix: keep project viewport within the visible frame
test: smoke test project worker output
docs: document numbered project rules
ci: validate generated project copies
```

Avoid large mixed commits that combine unrelated UI, runtime, documentation, and CI changes.
