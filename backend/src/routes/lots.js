const express = require('express');
const router = express.Router();
const repo = require('../config/repository');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { 
  broadcastLotOpened, 
  broadcastBidPlaced, 
  broadcastLotClosed 
} = require('../wsBroadcaster');

/**
 * GET /api/lots
 * List all auction lots
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const lots = await repo.getLots(filter);
    return res.json(lots);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch auction lots' });
  }
});

/**
 * GET /api/lots/:id
 * Get single lot details with bid feed
 */
router.get('/:id', async (req, res) => {
  try {
    const lot = await repo.findLotById(req.params.id);
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    const bids = await repo.getBidsForLot(req.params.id);
    return res.json({ lot, bids });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch lot details' });
  }
});

/**
 * POST /api/lots
 * Open a new auction lot (Admin / Auctioneer only)
 */
router.post('/', verifyToken, requireRole('Admin'), async (req, res) => {
  const { boatId, boatName, fishType, quantityKg, startingPrice } = req.body;

  if (!boatId || !fishType || !quantityKg || !startingPrice) {
    return res.status(400).json({ error: 'boatId, fishType, quantityKg, startingPrice are required' });
  }

  try {
    const lotId = 'lot_' + Date.now();
    const newLot = await repo.createLot({
      lotId,
      boatId,
      boatName: boatName || 'Malpe Trawler',
      fishType,
      quantityKg: Number(quantityKg),
      startingPrice: Number(startingPrice),
      currentPrice: Number(startingPrice),
      status: 'open',
      startTime: new Date()
    });

    // Update boat status to 'auctioning'
    await repo.updateBoatStatus(boatId, 'auctioning');

    // Broadcast lot:opened over WebSocket
    broadcastLotOpened(newLot);

    return res.status(201).json(newLot);
  } catch (err) {
    console.error('[Create Lot Error]', err);
    return res.status(500).json({ error: 'Failed to open auction lot' });
  }
});

/**
 * PATCH /api/lots/:id/close
 * Close an auction lot (Admin / Auctioneer only)
 */
router.patch('/:id/close', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const lotId = req.params.id;
    const lot = await repo.findLotById(lotId);
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    const updatedLot = await repo.closeLot(lotId, 'closed');
    broadcastLotClosed(updatedLot);

    return res.json(updatedLot);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close lot' });
  }
});

/**
 * POST /api/lots/:id/bids
 * Vendor places a bid on an active lot
 */
router.post('/:id/bids', verifyToken, requireRole('Vendor', 'Admin'), async (req, res) => {
  const lotId = req.params.id;
  const { bidAmount } = req.body;
  const vendorId = req.user.userId;
  const vendorName = req.user.name || req.user.businessName || 'Vendor ' + vendorId.slice(-4);

  if (!bidAmount || isNaN(bidAmount)) {
    return res.status(400).json({ error: 'Valid bidAmount is required' });
  }

  const amount = Number(bidAmount);

  try {
    const lot = await repo.findLotById(lotId);
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lot.status !== 'open') {
      return res.status(400).json({ error: `Cannot bid on a ${lot.status} lot` });
    }

    if (amount <= lot.currentPrice) {
      return res.status(400).json({ 
        error: `Bid amount must be higher than current price ₹${lot.currentPrice}` 
      });
    }

    // 1. Save new bid
    const bidId = 'bid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    const newBid = await repo.createBid({
      bidId,
      lotId,
      vendorId,
      vendorName,
      bidAmount: amount,
      timestamp: new Date()
    });

    // 2. Update current price & highest bidder on lot
    const updatedLot = await repo.updateLotPrice(lotId, amount, vendorId, vendorName);

    // 3. Broadcast bid:placed instantly via Socket.io
    const payload = {
      bidId: newBid.bidId,
      lotId: newBid.lotId,
      vendorId: newBid.vendorId,
      vendorName: newBid.vendorName,
      bidAmount: newBid.bidAmount,
      timestamp: newBid.timestamp,
      currentPrice: updatedLot.currentPrice
    };
    broadcastBidPlaced(payload);

    return res.status(201).json({ bid: newBid, lot: updatedLot });
  } catch (err) {
    console.error('[Place Bid Error]', err);
    return res.status(500).json({ error: 'Failed to place bid' });
  }
});

module.exports = router;
