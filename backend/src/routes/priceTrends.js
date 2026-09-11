const express = require('express');
const router = express.Router();
const repo = require('../config/repository');

/**
 * GET /api/price-trends
 * Query params: fishType (optional), range (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { fishType, range } = req.query;
    const limit = range === 'all' ? 200 : 50;
    const trends = await repo.getPriceTrends(fishType || null, limit);
    return res.json(trends);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch price trends' });
  }
});

module.exports = router;
