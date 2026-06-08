const fs = require('fs');
const path = require('path');

const numericProjectPattern = /^\d{3}$/;

function hasPublishMarker(rootDir, projectId) {
  return fs.existsSync(path.join(rootDir, projectId, '.published'));
}

function readConfiguredProjectIds() {
  return ['001', '002', '003', '004', '005', '006', '007', '008'];
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
