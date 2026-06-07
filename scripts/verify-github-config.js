const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function fail(message) {
  throw new Error(message);
}

function readText(relativePath) {
  const filePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing ${relativePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    fail(`${label} must include: ${expected}`);
  }
}

function assertCiWorkflow() {
  const workflow = readText('.github/workflows/ci.yml');
  const requiredSnippets = [
    'uses: actions/checkout@v4',
    'uses: pnpm/action-setup@v4',
    'uses: actions/setup-node@v4',
    'node-version: 22',
    'pnpm install --frozen-lockfile',
    'pnpm run sync:projects',
    'pnpm run verify:github',
    'pnpm run verify:projects',
    'pnpm run smoke:projects',
    'pnpm run build',
    'pnpm run budget:build',
    'pnpm run preview:check',
  ];

  requiredSnippets.forEach((snippet) => assertIncludes(workflow, snippet, 'CI workflow'));
}

function assertCodeqlWorkflow() {
  const workflow = readText('.github/workflows/codeql.yml');
  const requiredSnippets = [
    'security-events: write',
    'uses: actions/checkout@v4',
    'uses: github/codeql-action/init@v4',
    'uses: github/codeql-action/analyze@v4',
    'languages: javascript-typescript',
    'queries: +security-and-quality',
    'category: "/language:javascript-typescript"',
  ];

  requiredSnippets.forEach((snippet) => assertIncludes(workflow, snippet, 'CodeQL workflow'));
}

function assertDependabotConfig() {
  const config = readText('.github/dependabot.yml');
  const requiredSnippets = [
    'package-ecosystem: npm',
    'package-ecosystem: github-actions',
    'target-branch: main',
  ];

  requiredSnippets.forEach((snippet) => assertIncludes(config, snippet, 'Dependabot config'));
}

function assertRepositoryTemplates() {
  [
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/project_proposal.yml',
    '.github/ISSUE_TEMPLATE/question.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'public/.nojekyll',
  ].forEach((relativePath) => readText(relativePath));
}

function assertPackageScripts() {
  const packageJson = JSON.parse(readText('package.json'));
  const scripts = packageJson.scripts || {};

  if (scripts.postbuild !== 'node scripts/write-static-fallback.js') {
    fail('package.json must write build/404.html in postbuild for static hosting fallback');
  }

  if (!String(scripts.validate || '').includes('npm run verify:github')) {
    fail('package.json validate script must include verify:github');
  }
}

assertCiWorkflow();
assertCodeqlWorkflow();
assertDependabotConfig();
assertRepositoryTemplates();
assertPackageScripts();

console.log('Verified GitHub repository configuration');
