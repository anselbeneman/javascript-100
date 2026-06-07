const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const numericProjectPattern = /^\d{3}$/;

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }

      options[key] = value;
      index += 1;
    }
  }

  return options;
}

function getProjectIds() {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && numericProjectPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function nextProjectId() {
  const projectIds = getProjectIds();
  const lastProjectNumber = projectIds.length === 0
    ? 0
    : Math.max(...projectIds.map((id) => Number(id)));
  return String(lastProjectNumber + 1).padStart(3, '0');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function assertInsideRoot(targetPath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedRoot + path.sep) && resolvedTarget !== resolvedRoot) {
    throw new Error(`Refusing to write outside project root: ${resolvedTarget}`);
  }
}

function writeFile(filePath, contents) {
  assertInsideRoot(filePath);
  fs.writeFileSync(filePath, contents, 'utf8');
}

function renderIndex({ id, title, description }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta
    name="description"
    content="${description}"
  >
  <title>${id} - ${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="project-shell">
    <section class="project-panel" aria-labelledby="project-title">
      <p class="project-kicker">${id} / Vanilla JavaScript</p>
      <h1 id="project-title">${title}</h1>
      <p>${description}</p>
      <canvas id="projectCanvas" width="960" height="540" aria-label="${title} canvas"></canvas>
    </section>
  </main>

  <script src="main.js"></script>
</body>
</html>
`;
}

function renderStyle() {
  return `:root {
  --bg: #0b0d10;
  --panel: #151a21;
  --line: #28313d;
  --text: #f0f5fb;
  --muted: #9ba7b4;
  --accent: #f7df1e;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.project-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.project-panel {
  width: min(100%, 1040px);
}

.project-kicker {
  margin: 0 0 8px;
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
}

p {
  max-width: 720px;
  color: var(--muted);
  line-height: 1.55;
}

canvas {
  display: block;
  width: 100%;
  margin-top: 20px;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  background: var(--panel);
}
`;
}

function renderMain() {
  return `const canvas = document.getElementById('projectCanvas');
const context = canvas.getContext('2d');

function render() {
  const { width, height } = canvas;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f7df1e');
  gradient.addColorStop(1, '#111827');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

render();
`;
}

function renderReadme({ id, title, description }) {
  return `# ${id} - ${title}

${description}

## What It Does

- Describe the core interaction or visual system.
- Explain why the project is technically interesting.
- Keep the runtime standalone in this folder.

## Validation

From the repository root:

\`\`\`bash
pnpm run validate
\`\`\`
`;
}

function createProject(options) {
  const id = options.id || nextProjectId();
  const title = options.title;
  const description = options.description;
  const category = options.category;
  const projectDir = path.join(rootDir, id);

  if (!numericProjectPattern.test(id)) {
    throw new Error(`Project id must use three digits, received "${id}"`);
  }

  if (!title || !description || !category) {
    throw new Error('Usage: npm run create:project -- --title "Project Name" --description "JavaScript-focused description..." --category "Category" --yes');
  }

  if (!description.toLowerCase().includes('javascript') || description.length < 80) {
    throw new Error('Description must mention JavaScript and be at least 80 characters.');
  }

  if (!options.yes) {
    throw new Error(`Refusing to create ${id} without --yes. Next id is ${id}.`);
  }

  if (fs.existsSync(projectDir)) {
    throw new Error(`Project ${id} already exists.`);
  }

  assertInsideRoot(projectDir);
  fs.mkdirSync(projectDir, { recursive: false });

  const metadata = {
    $schema: '../schemas/project.schema.json',
    id,
    name: title,
    description,
    category,
    status: 'In Progress',
    difficulty: 'Advanced',
    tech: [
      'Canvas 2D',
      'Vanilla JavaScript',
      'Browser APIs',
    ],
  };

  writeFile(path.join(projectDir, 'project.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  writeFile(path.join(projectDir, 'index.html'), renderIndex({ id, title, description }));
  writeFile(path.join(projectDir, 'style.css'), renderStyle());
  writeFile(path.join(projectDir, 'main.js'), renderMain());
  writeFile(path.join(projectDir, 'README.md'), renderReadme({ id, title, description }));

  console.log(`Created ${id} - ${title}`);
  console.log(`Next: edit ${id}/, then run npm run sync:projects && npm run validate`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (Object.keys(options).length === 0) {
    console.log(`Next project id: ${nextProjectId()}`);
    process.exit(0);
  }
  createProject(options);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
