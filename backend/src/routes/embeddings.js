'use strict';

const express = require('express');
const router = express.Router();
const { runEmbeddingPipeline } = require('../embeddings/embeddingPipeline');
const hashManager = require('../embeddings/hashManager');

const VALID_FACILITIES = ['library', 'recreation', 'dining', 'ram_tram', 'tutoring', 'calendar', 'events'];

// POST /api/embeddings/refresh — run full pipeline
router.post('/refresh', async (req, res) => {
  try {
    console.log('[Embeddings] Manual refresh triggered (all facilities)');
    const result = await runEmbeddingPipeline();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Embeddings] Refresh failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/embeddings/refresh/:facility — run pipeline for one facility
router.post('/refresh/:facility', async (req, res) => {
  const { facility } = req.params;
  if (!VALID_FACILITIES.includes(facility)) {
    return res.status(400).json({
      success: false,
      error: `Invalid facility. Valid options: ${VALID_FACILITIES.join(', ')}`,
    });
  }
  try {
    console.log(`[Embeddings] Manual refresh triggered for: ${facility}`);
    const result = await runEmbeddingPipeline(facility);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[Embeddings] Refresh failed for ${facility}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/embeddings/status — return current hash file contents
router.get('/status', (req, res) => {
  const hashes = hashManager.loadHashes();
  res.json({ success: true, data: hashes });
});

module.exports = router;
