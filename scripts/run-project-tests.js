const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = process.cwd();
const scriptsDir = path.join(rootDir, 'scripts');
const testPattern = /^test-project-(\d{3})\.js$/;

const tests = fs
  .readdirSync(scriptsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && testPattern.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (tests.length === 0) {
  throw new Error('No project tests found in scripts/test-project-*.js');
}

tests.forEach((testFile) => {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, testFile)], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`${testFile} failed with exit code ${result.status}`);
  }
});

console.log(`Ran ${tests.length} project test(s)`);
