const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}

const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/malpe_auction';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`[DB Warning] Could not connect to MongoDB at ${mongoURI}: ${err.message}`);
    console.warn('[DB Warning] App will proceed; ensure MongoDB is running for data persistence.');
  }
};

module.exports = connectDB;
