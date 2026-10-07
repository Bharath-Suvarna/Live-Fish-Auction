const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const { startTrendAggregatorService } = require('./services/trendAggregator');

const authRoutes = require('./routes/auth');
const boatRoutes = require('./routes/boats');
const lotRoutes = require('./routes/lots');
const priceTrendRoutes = require('./routes/priceTrends');

const app = express();
const server = http.createServer(app);

// Enable CORS for web client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Benchmarking Logging Middleware
app.use(loggerMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boats', boatRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/price-trends', priceTrendRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Live Malpe Fish Auction API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Connect DB and start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  // Start trend aggregator background service (every 5 mins)
  startTrendAggregatorService(300000);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`[Malpe Harbor Backend] Server running on port ${PORT}`);
    console.log(`====================================================`);
  });
});

module.exports = { app, server };
