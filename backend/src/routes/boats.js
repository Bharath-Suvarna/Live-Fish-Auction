const express = require('express');
const router = express.Router();
const repo = require('../config/repository');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { broadcastBoatArrived } = require('../socket/socketHandler');

/**
 * GET /api/boats
 * Retrieve all boat arrivals for today
 */
router.get('/', async (req, res) => {
  try {
    const boats = await repo.getBoats();
    return res.json(boats);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch boats' });
  }
});

/**
 * POST /api/boats
 * Log a new boat arrival (Admin / Auctioneer only)
 */
router.post('/', verifyToken, requireRole('Admin'), async (req, res) => {
  const { boatName, ownerName, catchType, estimatedQuantityKg, status } = req.body;

  if (!boatName || !catchType || !estimatedQuantityKg) {
    return res.status(400).json({ error: 'boatName, catchType, and estimatedQuantityKg are required' });
  }

  try {
    const boatId = 'boat_' + Date.now();
    const newBoat = await repo.createBoat({
      boatId,
      boatName,
      ownerName: ownerName || 'Malpe Trawler Owner',
      catchType,
      estimatedQuantityKg: Number(estimatedQuantityKg),
      status: status || 'arrived',
      arrivalTime: new Date()
    });

    // Broadcast over WebSocket namespace /live
    broadcastBoatArrived(newBoat);

    return res.status(201).json(newBoat);
  } catch (err) {
    console.error('[Create Boat Error]', err);
    return res.status(500).json({ error: 'Failed to log boat arrival' });
  }
});

module.exports = router;
