const mongoose = require('mongoose');

const auctionLotSchema = new mongoose.Schema({
  lotId: { type: String, required: true, unique: true },
  boatId: { type: String, required: true },
  boatName: { type: String, default: '' },
  fishType: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  startingPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['open', 'closed', 'sold'], 
    default: 'open' 
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  winningVendorId: { type: String, default: null },
  winningVendorName: { type: String, default: null },
  highestBidAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('AuctionLot', auctionLotSchema);
