'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HASH_FILE = path.join(__dirname, '..', '..', 'data', 'embedding_hashes.json');

// Stable JSON stringify to ensure consistent hashing across key ordering
function stableStringify(val) {
  if (Array.isArray(val)) {
    return '[' + val.map(stableStringify).join(',') + ']';
  }
  if (val && typeof val === 'object') {
    const keys = Object.keys(val).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(val[k])).join(',') + '}';
  }
  return JSON.stringify(val);
}

function computeHash(data) {
  return crypto.createHash('sha256').update(stableStringify(data)).digest('hex');
}

function loadHashes() {
  try {
    if (fs.existsSync(HASH_FILE)) {
      return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[hashManager] Could not load hashes:', err.message);
  }
  return {};
}

function saveHashes(hashMap) {
  const dir = path.dirname(HASH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashMap, null, 2), 'utf8');
}

function getChangedFacilities(newHashes, storedHashes) {
  return Object.keys(newHashes).filter(key => {
    return !storedHashes[key] || storedHashes[key].hash !== newHashes[key].hash;
  });
}

module.exports = {
  computeHash,
  loadHashes,
  saveHashes,
  getChangedFacilities,
};
