const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  hasPublishMarker,
  normalizeProjectIds,
  readConfiguredProjectIds,
  readPublishedProjectIds,
} = require('./project-registry');

const rootDir = process.cwd();
const publicIndexPath = path.join(rootDir, 'public', 'index.html');
const publicProjectsPath = path.join(rootDir, 'public', 'projects.json');
const publicProjectsDir = path.join(rootDir, 'public', 'projects');
const publicRobotsPath = path.join(rootDir, 'public', 'robots.txt');
const publicSitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
const publicManifestPath = path.join(rootDir, 'public', 'site.webmanifest');
const projectConfigPath = path.join(rootDir, 'scripts', 'project-registry.js');
const projectSchemaPath = path.join(rootDir, 'schemas', 'project.schema.json');
const hubRouterPath = path.join(rootDir, 'src', 'hub', 'Router.jsx');
const hubNotFoundPath = path.join(rootDir, 'src', 'hub', 'NotFound.jsx');
const vercelConfigPath = path.join(rootDir, 'vercel.json');
const requiredMetadataFields = ['id', 'name', 'description', 'category', 'status', 'difficulty'];
const allowedMetadataFields = new Set(['$schema', 'id', 'name', 'description', 'category', 'status', 'difficulty', 'tech']);
const allowedStatuses = new Set(['Planned', 'In Progress', 'Complete']);
const allowedDifficulties = new Set(['Intermediate', 'Advanced', 'Expert']);
const excludedProjectFiles = new Set(['project.json', '.published']);
const forbiddenProjectEntries = [
  'node_modules',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'vite.config.js',
  'vite.config.ts',
  'webpack.config.js',
  'tsconfig.json',
];

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON at ${path.relative(rootDir, filePath)}: ${error.message}`);
  }
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing ${label}: ${path.relative(rootDir, filePath)}`);
  }
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';

  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    fail(`Invalid PNG file: ${path.relative(rootDir, filePath)}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertInsideDirectory(baseDir, targetPath, label) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    fail(`${label} points outside ${path.relative(rootDir, baseDir)}: ${path.relative(rootDir, resolvedTarget)}`);
  }
}

function assertNonEmptyString(value, field, projectId) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`Project ${projectId} has invalid metadata field "${field}"`);
  }
}

function assertProjectMetadata(metadata, projectId) {
  Object.keys(metadata).forEach((field) => {
    if (!allowedMetadataFields.has(field)) {
      fail(`Project ${projectId} has unsupported metadata field "${field}"`);
    }
  });

  if (metadata.$schema !== '../schemas/project.schema.json') {
    fail(`Project ${projectId} metadata must declare "$schema": "../schemas/project.schema.json"`);
  }

  requiredMetadataFields.forEach((field) => {
    assertNonEmptyString(metadata[field], field, projectId);
  });

  if (!allowedStatuses.has(metadata.status)) {
    fail(`Project ${projectId} has invalid status "${metadata.status}"`);
  }

  if (!allowedDifficulties.has(metadata.difficulty)) {
    fail(`Project ${projectId} has invalid difficulty "${metadata.difficulty}"`);
  }

  if (!Array.isArray(metadata.tech) || metadata.tech.length < 3 || metadata.tech.length > 6) {
    fail(`Project ${projectId} metadata field "tech" must contain 3 to 6 items`);
  }

  metadata.tech.forEach((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      fail(`Project ${projectId} has invalid tech item`);
    }
  });

  if (new Set(metadata.tech).size !== metadata.tech.length) {
    fail(`Project ${projectId} metadata field "tech" must not contain duplicates`);
  }
}

function assertProjectSchemaFile() {
  assertFile(projectSchemaPath, 'project metadata JSON schema');

  const schema = readJson(projectSchemaPath);

  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    fail('schemas/project.schema.json must use JSON Schema draft 2020-12');
  }

  if (!schema.properties || schema.properties.$schema.const !== '../schemas/project.schema.json') {
    fail('schemas/project.schema.json must define the local $schema const');
  }

  if (!Array.isArray(schema.required) || !schema.required.includes('tech')) {
    fail('schemas/project.schema.json must require project tech metadata');
  }
}

function assertProjectRegistryConfig(projectIds) {
  assertFile(projectConfigPath, 'published project registry');

  const rawIds = readConfiguredProjectIds(rootDir);
  const normalizedIds = normalizeProjectIds(rawIds);

  if (normalizedIds.length !== rawIds.length) {
    fail('scripts/project-registry.js must contain unique three-digit published project ids only');
  }

  const missingMarkers = normalizedIds.filter((projectId) => !hasPublishMarker(rootDir, projectId));

  if (missingMarkers.length > 0) {
    fail(`scripts/project-registry.js lists project ids without .published markers: ${missingMarkers.join(', ')}`);
  }

  if (normalizedIds.join('\n') !== projectIds.join('\n')) {
    fail('scripts/project-registry.js must list only the projects currently published in the hub');
  }
}

function assertHubRoutes() {
  assertFile(hubRouterPath, 'hub router');
  assertFile(hubNotFoundPath, 'hub not found route');

  const router = fs.readFileSync(hubRouterPath, 'utf8');
  const notFound = fs.readFileSync(hubNotFoundPath, 'utf8');

  if (!router.includes('path="*"') || !router.includes('<NotFound />')) {
    fail('src/hub/Router.jsx must define a wildcard NotFound route');
  }

  if (!notFound.includes('Route "{location.pathname}" does not exist.')) {
    fail('src/hub/NotFound.jsx must show the missing route path');
  }
}

function assertStandaloneProject(projectDir, projectId) {
  forbiddenProjectEntries.forEach((entry) => {
    const entryPath = path.join(projectDir, entry);

    if (fs.existsSync(entryPath)) {
      fail(`Project ${projectId} must stay standalone; remove ${path.relative(rootDir, entryPath)}`);
    }
  });
}

function normalizeAssetReference(reference) {
  return reference.trim().split('#')[0].split('?')[0];
}

function assertPortableAssetReference(reference, projectId) {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(reference) || /^[a-z][a-z\d+.-]*:/i.test(reference)) {
    fail(`Project ${projectId} must not load external script/link asset: ${reference}`);
  }

  if (reference.startsWith('/')) {
    fail(`Project ${projectId} must use relative script/link assets, received: ${reference}`);
  }
}

function isAssetLinkTag(tag) {
  const relMatch = tag.match(/\brel=["']([^"']+)["']/i);

  if (!relMatch) {
    return false;
  }

  const assetRels = new Set(['stylesheet', 'icon', 'apple-touch-icon', 'preload', 'modulepreload', 'manifest']);
  return relMatch[1]
    .toLowerCase()
    .split(/\s+/)
    .some((rel) => assetRels.has(rel));
}

function readTagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

function readMetaAttributeContent(html, attribute, value) {
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const targetTag = metaTags.find((tag) => {
    const attributeMatch = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, 'i'));
    return attributeMatch && attributeMatch[1].toLowerCase() === value.toLowerCase();
  });

  if (!targetTag) {
    return '';
  }

  const contentMatch = targetTag.match(/\bcontent=["']([^"']+)["']/i);
  return contentMatch ? contentMatch[1].trim().replace(/\s+/g, ' ') : '';
}

function readMetaContent(html, name) {
  return readMetaAttributeContent(html, 'name', name);
}

function readMetaPropertyContent(html, property) {
  return readMetaAttributeContent(html, 'property', property);
}

function readLinkHref(html, rel) {
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const targetTag = linkTags.find((tag) => {
    const relMatch = tag.match(/\brel=["']([^"']+)["']/i);
    return relMatch && relMatch[1].toLowerCase().split(/\s+/).includes(rel.toLowerCase());
  });

  if (!targetTag) {
    return '';
  }

  const hrefMatch = targetTag.match(/\bhref=["']([^"']+)["']/i);
  return hrefMatch ? hrefMatch[1].trim() : '';
}

function assertPublicAsset(reference, label) {
  if (!reference) {
    fail(`public/index.html is missing ${label}`);
  }

  let assetPath = reference;

  if (/^https?:\/\//i.test(reference)) {
    try {
      assetPath = new URL(reference).pathname;
    } catch (error) {
      fail(`public/index.html has invalid ${label}: ${reference}`);
    }
  }

  if (!assetPath.startsWith('/')) {
    fail(`public/index.html ${label} must point to a root public asset: ${reference}`);
  }

  const resolvedAsset = path.join(rootDir, 'public', assetPath.slice(1));
  assertFile(resolvedAsset, `public asset for ${label}`);
  return resolvedAsset;
}

function assertPublicIndexMetadata() {
  assertFile(publicIndexPath, 'public index');

  const html = fs.readFileSync(publicIndexPath, 'utf8');
  const title = readTagContent(html, 'title');
  const description = readMetaContent(html, 'description');
  const viewport = readMetaContent(html, 'viewport');
  const canonical = readLinkHref(html, 'canonical');
  const themeColor = readMetaContent(html, 'theme-color');
  const ogImage = readMetaPropertyContent(html, 'og:image');
  const twitterImage = readMetaContent(html, 'twitter:image');
  const manifestHref = readLinkHref(html, 'manifest');

  if (title !== 'JavaScript 100 Ansel') {
    fail('public/index.html title must be "JavaScript 100 Ansel"');
  }

  if (description.length < 100 || !description.toLowerCase().includes('javascript')) {
    fail('public/index.html must define a JavaScript-focused meta description of at least 100 characters');
  }

  if (!viewport.includes('width=device-width') || !viewport.includes('initial-scale=1')) {
    fail('public/index.html must define a responsive viewport meta tag');
  }

  if (!canonical.startsWith('https://') || !canonical.endsWith('/')) {
    fail('public/index.html must define an absolute HTTPS canonical URL ending with /');
  }

  if (!/^#[0-9a-f]{6}$/i.test(themeColor)) {
    fail('public/index.html must define a 6-digit hex theme-color');
  }

  const requiredProperties = {
    'og:type': 'website',
    'og:url': canonical,
    'og:title': title,
    'og:description': null,
    'og:image': null,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': null,
  };

  Object.entries(requiredProperties).forEach(([property, expected]) => {
    const value = readMetaPropertyContent(html, property);
    if (!value) {
      fail(`public/index.html is missing ${property}`);
    }
    if (expected !== null && value !== expected) {
      fail(`public/index.html ${property} must be "${expected}", received "${value}"`);
    }
  });

  const requiredTwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': null,
    'twitter:image': ogImage,
  };

  Object.entries(requiredTwitterTags).forEach(([name, expected]) => {
    const value = readMetaContent(html, name);
    if (!value) {
      fail(`public/index.html is missing ${name}`);
    }
    if (expected !== null && value !== expected) {
      fail(`public/index.html ${name} must be "${expected}", received "${value}"`);
    }
  });

  assertPublicAsset(readLinkHref(html, 'icon'), 'favicon');
  assertPublicAsset(readLinkHref(html, 'apple-touch-icon'), 'apple touch icon');
  assertPublicAsset(manifestHref, 'web app manifest');
  assertPublicAsset(ogImage, 'Open Graph image');
  assertPublicAsset(twitterImage, 'Twitter image');

  if (manifestHref !== '/site.webmanifest') {
    fail('public/index.html manifest link must point to /site.webmanifest');
  }
}

function assertVercelRoutingConfig() {
  assertFile(vercelConfigPath, 'Vercel routing config');

  const config = readJson(vercelConfigPath);
  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
  const headers = Array.isArray(config.headers) ? config.headers : [];

  const hasProjectRewrite = rewrites.some((rewrite) => (
    rewrite
    && rewrite.source === '/project/:path*'
    && rewrite.destination === '/index.html'
  ));

  if (!hasProjectRewrite) {
    fail('vercel.json must rewrite /project/:path* to /index.html for direct viewer URLs');
  }

  const unsafeCatchAllRewrite = rewrites.find((rewrite) => (
    rewrite
    && (rewrite.source === '/:path*' || rewrite.source === '/(.*)')
    && rewrite.destination === '/index.html'
  ));

  if (unsafeCatchAllRewrite) {
    fail('vercel.json must not rewrite every path to /index.html because /projects/* must stay static');
  }

  const hasStaticCacheHeader = headers.some((entry) => (
    entry
    && entry.source === '/static/(.*)'
    && Array.isArray(entry.headers)
    && entry.headers.some((header) => (
      header.key.toLowerCase() === 'cache-control'
      && header.value.includes('immutable')
    ))
  ));

  if (!hasStaticCacheHeader) {
    fail('vercel.json must cache hashed /static assets with immutable Cache-Control');
  }

  const globalHeaderEntry = headers.find((entry) => entry && entry.source === '/(.*)');
  const globalHeaders = new Map(
    (globalHeaderEntry && Array.isArray(globalHeaderEntry.headers) ? globalHeaderEntry.headers : [])
      .map((header) => [String(header.key || '').toLowerCase(), String(header.value || '')]),
  );
  const requiredGlobalHeaders = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  };

  Object.entries(requiredGlobalHeaders).forEach(([key, expected]) => {
    if (globalHeaders.get(key) !== expected) {
      fail(`vercel.json must set ${key} to "${expected}" on /(.*)`);
    }
  });

  const contentSecurityPolicy = globalHeaders.get('content-security-policy') || '';
  [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "worker-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "manifest-src 'self'",
  ].forEach((directive) => {
    if (!contentSecurityPolicy.includes(directive)) {
      fail(`vercel.json Content-Security-Policy must include ${directive}`);
    }
  });
}

function assertPublicDiscoveryFiles(projectIds) {
  assertFile(publicRobotsPath, 'robots.txt');
  assertFile(publicSitemapPath, 'sitemap.xml');
  assertFile(publicManifestPath, 'site.webmanifest');

  const html = fs.readFileSync(publicIndexPath, 'utf8');
  const canonical = readLinkHref(html, 'canonical');
  const siteOrigin = new URL(canonical).origin;
  const robots = fs.readFileSync(publicRobotsPath, 'utf8');
  const sitemap = fs.readFileSync(publicSitemapPath, 'utf8');
  const manifest = readJson(publicManifestPath);

  if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) {
    fail('public/robots.txt must allow crawling');
  }

  if (!robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
    fail('public/robots.txt must reference the canonical sitemap URL');
  }

  if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    fail('public/sitemap.xml must use the sitemap urlset namespace');
  }

  if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
    fail('public/sitemap.xml must include the canonical home URL');
  }

  projectIds.forEach((projectId) => {
    const projectUrl = `${siteOrigin}/project/${projectId}`;
    if (!sitemap.includes(`<loc>${projectUrl}</loc>`)) {
      fail(`public/sitemap.xml must include ${projectUrl}`);
    }
  });

  const sitemapProjectIds = [...sitemap.matchAll(/\/project\/(\d{3})</g)]
    .map((match) => match[1])
    .sort();

  if (sitemapProjectIds.join('\n') !== projectIds.join('\n')) {
    fail('public/sitemap.xml must only include published project viewer routes');
  }

  if (sitemap.includes('/projects/')) {
    fail('public/sitemap.xml must index viewer routes, not generated iframe asset routes');
  }

  if (manifest.name !== 'JavaScript 100 Ansel' || manifest.short_name !== 'JS 100') {
    fail('public/site.webmanifest must identify JavaScript 100 Ansel');
  }

  if (manifest.start_url !== '/' || manifest.scope !== '/' || manifest.display !== 'standalone') {
    fail('public/site.webmanifest must use root start_url, root scope, and standalone display');
  }

  if (manifest.theme_color !== '#111827' || manifest.background_color !== '#0b0d10') {
    fail('public/site.webmanifest colors must match the hub theme');
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const hasFaviconIcon = icons.some((icon) => (
    icon
    && icon.src === '/favicon.svg'
    && icon.type === 'image/svg+xml'
  ));

  if (!hasFaviconIcon) {
    fail('public/site.webmanifest must expose /favicon.svg as an SVG icon');
  }

  [
    { src: '/icon-192.png', size: 192 },
    { src: '/icon-512.png', size: 512 },
  ].forEach((expectedIcon) => {
    const icon = icons.find((item) => item && item.src === expectedIcon.src);

    if (!icon) {
      fail(`public/site.webmanifest must include ${expectedIcon.src}`);
    }

    if (icon.sizes !== `${expectedIcon.size}x${expectedIcon.size}` || icon.type !== 'image/png') {
      fail(`public/site.webmanifest has invalid metadata for ${expectedIcon.src}`);
    }

    if (!String(icon.purpose || '').split(/\s+/).includes('maskable')) {
      fail(`public/site.webmanifest ${expectedIcon.src} must include maskable purpose`);
    }

    const iconPath = assertPublicAsset(icon.src, `manifest icon ${expectedIcon.src}`);
    const dimensions = readPngDimensions(iconPath);

    if (dimensions.width !== expectedIcon.size || dimensions.height !== expectedIcon.size) {
      fail(`public icon ${expectedIcon.src} must be ${expectedIcon.size}x${expectedIcon.size}`);
    }
  });
}

function assertHtmlMetadata(html, metadata, projectId) {
  const title = readTagContent(html, 'title');
  const description = readMetaContent(html, 'description');
  const viewport = readMetaContent(html, 'viewport');

  if (!title) {
    fail(`Project ${projectId} index.html must define a title`);
  }

  if (!title.includes(projectId) || !title.includes(metadata.name)) {
    fail(`Project ${projectId} title must include "${projectId}" and "${metadata.name}"`);
  }

  if (description.length < 80) {
    fail(`Project ${projectId} meta description must be at least 80 characters`);
  }

  if (!description.toLowerCase().includes('javascript')) {
    fail(`Project ${projectId} meta description must mention JavaScript`);
  }

  if (!viewport.includes('width=device-width') || !viewport.includes('initial-scale=1')) {
    fail(`Project ${projectId} index.html must define a responsive viewport meta tag`);
  }
}

function readHtmlIds(html) {
  return [...html.matchAll(/\bid=["']([^"']+)["']/gi)]
    .map((match) => match[1]);
}

function readHtmlClasses(html) {
  return new Set(
    [...html.matchAll(/\bclass=["']([^"']+)["']/gi)]
      .flatMap((match) => match[1].trim().split(/\s+/))
      .filter(Boolean),
  );
}

function assertUniqueIds(html, projectId) {
  const ids = readHtmlIds(html);
  const seen = new Set();
  const duplicates = new Set();

  ids.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  });

  if (duplicates.size > 0) {
    fail(`Project ${projectId} has duplicate HTML ids: ${[...duplicates].sort().join(', ')}`);
  }

  return new Set(ids);
}

function assertDomContracts(projectDir, html, projectId) {
  const htmlIds = assertUniqueIds(html, projectId);
  const htmlClasses = readHtmlClasses(html);
  const scriptFiles = listFiles(projectDir).filter((file) => file.endsWith('.js'));

  scriptFiles.forEach((relativeFile) => {
    const script = fs.readFileSync(path.join(projectDir, relativeFile), 'utf8');
    const idReferences = [...script.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)]
      .map((match) => match[1]);
    const missingIds = idReferences
      .filter((id) => !htmlIds.has(id));

    if (missingIds.length > 0) {
      fail(`Project ${projectId} script ${relativeFile} references missing HTML ids: ${[...new Set(missingIds)].sort().join(', ')}`);
    }

    const selectorReferences = [...script.matchAll(/querySelector\(\s*["']([.#][A-Za-z0-9_-]+)["']\s*\)/g)]
      .map((match) => match[1]);
    const missingSelectors = selectorReferences.filter((selector) => {
      if (selector.startsWith('#')) {
        return !htmlIds.has(selector.slice(1));
      }

      return !htmlClasses.has(selector.slice(1));
    });

    if (missingSelectors.length > 0) {
      fail(`Project ${projectId} script ${relativeFile} references missing HTML selectors: ${[...new Set(missingSelectors)].sort().join(', ')}`);
    }
  });
}

function assertReferencedAssets(projectDir, html, projectId) {
  const scriptReferences = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1]);
  const linkReferences = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
    .filter((match) => isAssetLinkTag(match[0]))
    .map((match) => match[1]);
  const references = [...scriptReferences, ...linkReferences];

  references.forEach((reference) => {
    assertPortableAssetReference(reference, projectId);

    const normalizedReference = normalizeAssetReference(reference);
    const assetPath = path.join(projectDir, normalizedReference);
    assertInsideDirectory(projectDir, assetPath, `Project ${projectId} asset reference`);
    assertFile(assetPath, `referenced asset for project ${projectId}`);
  });

  listFiles(projectDir)
    .filter((file) => file.endsWith('.js'))
    .forEach((relativeFile) => {
      const script = fs.readFileSync(path.join(projectDir, relativeFile), 'utf8');
      const importedScripts = [...script.matchAll(/importScripts\(([^)]+)\)/g)]
        .flatMap((match) => [...match[1].matchAll(/["']([^"']+)["']/g)].map((assetMatch) => assetMatch[1]));

      importedScripts.forEach((reference) => {
        assertPortableAssetReference(reference, projectId);

        const normalizedReference = normalizeAssetReference(reference);
        const assetPath = path.join(projectDir, normalizedReference);
        assertInsideDirectory(projectDir, assetPath, `Project ${projectId} worker import`);
        assertFile(assetPath, `worker import for project ${projectId}`);
      });
    });
}

function listFiles(dir, baseDir = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, entryPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        return listFiles(entryPath, baseDir);
      }

      return entry.isFile() ? [relativePath] : [];
    })
    .sort();
}

function assertJavaScriptSyntax(projectDir, projectId) {
  const scriptFiles = listFiles(projectDir).filter((file) => file.endsWith('.js'));

  scriptFiles.forEach((relativeFile) => {
    const scriptPath = path.join(projectDir, relativeFile);
    const result = spawnSync(process.execPath, ['--check', scriptPath], {
      encoding: 'utf8',
      windowsHide: true,
    });

    if (result.status !== 0) {
      const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
      fail(`Project ${projectId} has invalid JavaScript in ${relativeFile}${output ? `:\n${output}` : ''}`);
    }
  });
}

function assertGeneratedProjectCopy(projectDir, publicProjectDir, projectId) {
  assertFile(path.join(publicProjectDir, 'index.html'), `public index for project ${projectId}`);

  const sourceFiles = listFiles(projectDir).filter((file) => !excludedProjectFiles.has(file));
  const generatedFiles = listFiles(publicProjectDir);
  const sourceFileList = sourceFiles.join('\n');
  const generatedFileList = generatedFiles.join('\n');

  if (sourceFileList !== generatedFileList) {
    fail(`Generated copy for project ${projectId} is out of sync. Run pnpm run sync:projects.`);
  }

  sourceFiles.forEach((relativeFile) => {
    const sourceFile = path.join(projectDir, relativeFile);
    const generatedFile = path.join(publicProjectDir, relativeFile);
    const sourceContent = fs.readFileSync(sourceFile);
    const generatedContent = fs.readFileSync(generatedFile);

    if (!sourceContent.equals(generatedContent)) {
      fail(`Generated file is out of sync for project ${projectId}: ${relativeFile}`);
    }
  });
}

const projectIds = readPublishedProjectIds(rootDir);

assertPublicIndexMetadata();
assertVercelRoutingConfig();
assertPublicDiscoveryFiles(projectIds);
assertProjectRegistryConfig(projectIds);
assertProjectSchemaFile();
assertHubRoutes();

const projects = projectIds.map((projectId) => {
  const projectDir = path.join(rootDir, projectId);
  const metadataPath = path.join(projectDir, 'project.json');
  const indexPath = path.join(projectDir, 'index.html');
  const readmePath = path.join(projectDir, 'README.md');

  assertFile(indexPath, `index for project ${projectId}`);
  assertFile(metadataPath, `metadata for project ${projectId}`);
  assertFile(readmePath, `README for project ${projectId}`);
  assertFile(path.join(projectDir, '.published'), `publish marker for project ${projectId}`);
  assertStandaloneProject(projectDir, projectId);

  const metadata = readJson(metadataPath);

  assertProjectMetadata(metadata, projectId);

  if (metadata.id !== projectId) {
    fail(`Project ${projectId} metadata id must be "${projectId}", received "${metadata.id}"`);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  assertHtmlMetadata(html, metadata, projectId);
  assertDomContracts(projectDir, html, projectId);
  assertReferencedAssets(projectDir, html, projectId);
  assertJavaScriptSyntax(projectDir, projectId);

  return metadata;
});

assertFile(publicProjectsPath, 'public projects manifest');

const publicProjects = readJson(publicProjectsPath);
const manifestProjects = projects.map((metadata) => {
  const { $schema, ...publicMetadata } = metadata;
  return publicMetadata;
});
const expectedManifest = JSON.stringify(manifestProjects, null, 2);
const actualManifest = JSON.stringify(publicProjects, null, 2);

if (actualManifest !== expectedManifest) {
  fail('public/projects.json is out of sync. Run pnpm run sync:projects.');
}

projectIds.forEach((projectId) => {
  assertGeneratedProjectCopy(
    path.join(rootDir, projectId),
    path.join(publicProjectsDir, projectId),
    projectId,
  );
});

console.log(`Verified ${projects.length} project(s): ${projectIds.length ? projectIds.join(', ') : 'none'}`);
