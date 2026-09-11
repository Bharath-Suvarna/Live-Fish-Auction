const mongoose = require('mongoose');

const priceTrendSchema = new mongoose.Schema({
  fishType: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  avgPricePerKg: { type: Number, required: true },
  minPrice: { type: Number },
  maxPrice: { type: Number },
  sampleCount: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('PriceTrend', priceTrendSchema);
