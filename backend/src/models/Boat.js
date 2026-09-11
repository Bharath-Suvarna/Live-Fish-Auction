const mongoose = require('mongoose');

const boatSchema = new mongoose.Schema({
  boatId: { type: String, required: true, unique: true },
  boatName: { type: String, required: true },
  ownerName: { type: String, required: true },
  arrivalTime: { type: Date, default: Date.now },
  catchType: { 
    type: String, 
    required: true,
    enum: ['Mackerel', 'Sardine', 'Prawns', 'Tuna', 'Kingfish', 'Squid', 'Pomfret', 'Seerfish'] 
  },
  estimatedQuantityKg: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['arrived', 'unloading', 'auctioning', 'done'], 
    default: 'arrived' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Boat', boatSchema);
