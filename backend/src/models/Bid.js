const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  bidId: { type: String, required: true, unique: true },
  lotId: { type: String, required: true, index: true },
  vendorId: { type: String, required: true },
  vendorName: { type: String, required: true },
  bidAmount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);
