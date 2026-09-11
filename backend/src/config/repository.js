/**
 * Data Repository Abstraction Layer
 * Wraps database operations to satisfy key-value / document access patterns (DynamoDB/MongoDB compatible).
 */

const User = require('../models/User');
const Boat = require('../models/Boat');
const AuctionLot = require('../models/AuctionLot');
const Bid = require('../models/Bid');
const PriceTrend = require('../models/PriceTrend');

class DataRepository {
  // Users
  async findUserByEmail(email) {
    return await User.findOne({ email });
  }

  async findUserById(userId) {
    return await User.findOne({ userId });
  }

  async createUser(userData) {
    return await User.create(userData);
  }

  // Boats
  async getBoats(filter = {}) {
    return await Boat.find(filter).sort({ arrivalTime: -1 });
  }

  async findBoatById(boatId) {
    return await Boat.findOne({ boatId });
  }

  async createBoat(boatData) {
    return await Boat.create(boatData);
  }

  async updateBoatStatus(boatId, status) {
    return await Boat.findOneAndUpdate({ boatId }, { status }, { new: true });
  }

  // Lots
  async getLots(filter = {}) {
    return await AuctionLot.find(filter).sort({ createdAt: -1 });
  }

  async findLotById(lotId) {
    return await AuctionLot.findOne({ lotId });
  }

  async createLot(lotData) {
    return await AuctionLot.create(lotData);
  }

  async updateLotPrice(lotId, newPrice, winningVendorId, winningVendorName) {
    return await AuctionLot.findOneAndUpdate(
      { lotId },
      { 
        currentPrice: newPrice,
        highestBidAmount: newPrice,
        winningVendorId,
        winningVendorName
      },
      { new: true }
    );
  }

  async closeLot(lotId, status = 'closed') {
    return await AuctionLot.findOneAndUpdate(
      { lotId },
      { status, endTime: new Date() },
      { new: true }
    );
  }

  // Bids
  async getBidsForLot(lotId) {
    return await Bid.find({ lotId }).sort({ timestamp: -1 });
  }

  async createBid(bidData) {
    return await Bid.create(bidData);
  }

  // Price Trends
  async getPriceTrends(fishType = null, limit = 50) {
    const filter = fishType ? { fishType } : {};
    return await PriceTrend.find(filter).sort({ timestamp: -1 }).limit(limit);
  }

  async createPriceTrend(trendData) {
    return await PriceTrend.create(trendData);
  }
}

module.exports = new DataRepository();
