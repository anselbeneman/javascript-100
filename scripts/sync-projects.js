const fs = require('fs');
const path = require('path');
const { readPublishedProjectIds } = require('./project-registry');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const publicProjectsDir = path.join(publicDir, 'projects');
const publicIndexPath = path.join(publicDir, 'index.html');
const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
const excludedProjectFiles = new Set(['project.json', '.published']);

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

  delete metadata.$schema;
  return metadata;
}

function readCanonicalUrl() {
  const html = fs.readFileSync(publicIndexPath, 'utf8');
  const match = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);

  if (!match) {
    throw new Error('public/index.html is missing a canonical URL');
  }

  return match[1].trim();
}

function renderSitemap(projectIds) {
  const canonical = readCanonicalUrl();
  const homeUrl = canonical.endsWith('/') ? canonical : `${canonical}/`;
  const siteOrigin = new URL(homeUrl).origin;
  const urls = [
    { loc: homeUrl, priority: '1.0' },
    ...projectIds.map((projectId) => ({
      loc: `${siteOrigin}/project/${projectId}`,
      priority: '0.9',
    })),
  ];

  const urlEntries = urls.map(({ loc, priority }) => (
    `  <url>\n`
    + `    <loc>${loc}</loc>\n`
    + `    <priority>${priority}</priority>\n`
    + `  </url>`
  ));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n');
}

function copyProject(projectId) {
  const sourceDir = path.join(rootDir, projectId);
  const targetDir = path.join(publicProjectsDir, projectId);

  assertInsideRoot(sourceDir);
  assertInsideRoot(targetDir);

  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    filter: (source) => !excludedProjectFiles.has(path.basename(source)),
  });
}

const projectIds = readPublishedProjectIds(rootDir);

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

fs.writeFileSync(publicSitemapPath, renderSitemap(projectIds), 'utf8');

const projectList = projectIds.length > 0 ? projectIds.join(', ') : 'none';

console.log(`Synced ${projects.length} project(s): ${projectList}`);
