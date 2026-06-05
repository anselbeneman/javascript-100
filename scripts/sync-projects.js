const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const publicProjectsDir = path.join(publicDir, 'projects');
const numericProjectPattern = /^\d{3}$/;

function assertInsideRoot(targetPath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedRoot + path.sep) && resolvedTarget !== resolvedRoot) {
    throw new Error(`Refusing to touch path outside project root: ${resolvedTarget}`);
  }
}

function readProjectMetadata(projectId) {
  const projectDir = path.join(rootDir, projectId);
  const metadataPath = path.join(projectDir, 'project.json');
  const indexPath = path.join(projectDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Project ${projectId} is missing index.html`);
  }

  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Project ${projectId} is missing project.json`);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

  if (metadata.id !== projectId) {
    throw new Error(`Project ${projectId} has mismatched metadata id: ${metadata.id}`);
  }

  return metadata;
}

function copyProject(projectId) {
  const sourceDir = path.join(rootDir, projectId);
  const targetDir = path.join(publicProjectsDir, projectId);

  assertInsideRoot(sourceDir);
  assertInsideRoot(targetDir);

  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    filter: (source) => path.basename(source) !== 'project.json',
  });
}

const projectIds = fs
  .readdirSync(rootDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && numericProjectPattern.test(entry.name))
  .map((entry) => entry.name)
  .sort();

assertInsideRoot(publicProjectsDir);
fs.rmSync(publicProjectsDir, { recursive: true, force: true });
fs.mkdirSync(publicProjectsDir, { recursive: true });

const projects = projectIds.map(readProjectMetadata);

projectIds.forEach(copyProject);

fs.writeFileSync(
  path.join(publicDir, 'projects.json'),
  `${JSON.stringify(projects, null, 2)}\n`,
  'utf8'
);

const projectList = projectIds.length > 0 ? projectIds.join(', ') : 'none';

console.log(`Synced ${projects.length} project(s): ${projectList}`);
