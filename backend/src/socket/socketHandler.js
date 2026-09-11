const repo = require('../config/repository');

let liveNamespace = null;

const initSocketHandler = (io) => {
  liveNamespace = io.of('/live');

  liveNamespace.on('connection', async (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Re-sync state on connection: Send current snapshot of active lots & boats today
    try {
      const activeLots = await repo.getLots({ status: 'open' });
      const recentBoats = await repo.getBoats();
      const recentTrends = await repo.getPriceTrends(null, 20);

      socket.emit('state:sync', {
        activeLots,
        recentBoats,
        recentTrends,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Socket.io Sync Error]', err.message);
    }

    // Handle joining lot-specific rooms for real-time bid feed
    socket.on('join:lot', (lotId) => {
      socket.join(`lot:${lotId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined lot:${lotId}`);
    });

    socket.on('leave:lot', (lotId) => {
      socket.leave(`lot:${lotId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

const getLiveNamespace = () => liveNamespace;

// Broadcast helpers
const broadcastBoatArrived = (boat) => {
  if (liveNamespace) {
    liveNamespace.emit('boat:arrived', boat);
  }
};

const broadcastLotOpened = (lot) => {
  if (liveNamespace) {
    liveNamespace.emit('lot:opened', lot);
  }
};

const broadcastBidPlaced = (bidData) => {
  if (liveNamespace) {
    // Broadcast to global dashboard
    liveNamespace.emit('bid:placed', bidData);
    // Broadcast to lot-specific subscribers
    liveNamespace.to(`lot:${bidData.lotId}`).emit('bid:placed', bidData);
  }
};

const broadcastLotClosed = (lotData) => {
  if (liveNamespace) {
    liveNamespace.emit('lot:closed', lotData);
    liveNamespace.to(`lot:${lotData.lotId}`).emit('lot:closed', lotData);
  }
};

const broadcastPriceTrend = (trendData) => {
  if (liveNamespace) {
    liveNamespace.emit('price:trend-update', trendData);
  }
};

module.exports = {
  initSocketHandler,
  getLiveNamespace,
  broadcastBoatArrived,
  broadcastLotOpened,
  broadcastBidPlaced,
  broadcastLotClosed,
  broadcastPriceTrend
};
