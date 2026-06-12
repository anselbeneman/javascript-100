const fs = require('fs');
const path = require('path');

const numericProjectPattern = /^\d{3}$/;

function hasPublishMarker(rootDir, projectId) {
  return fs.existsSync(path.join(rootDir, projectId, '.published'));
}

function readConfiguredProjectIds(rootDir = process.cwd()) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && numericProjectPattern.test(entry.name))
    .map((entry) => entry.name)
    .filter((projectId) => hasPublishMarker(rootDir, projectId));
}

function normalizeProjectIds(ids) {
  const seen = new Set();

  return ids.map((id) => String(id).trim())
    .filter((id) => {
      if (!numericProjectPattern.test(id) || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    })
    .sort();
}

function readPublishedProjectIds(rootDir) {
  return normalizeProjectIds(readConfiguredProjectIds(rootDir))
    .filter((id) => hasPublishMarker(rootDir, id));
}

module.exports = {
  hasPublishMarker,
  numericProjectPattern,
  normalizeProjectIds,
  readConfiguredProjectIds,
  readPublishedProjectIds,
};
