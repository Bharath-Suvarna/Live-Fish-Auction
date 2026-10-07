const repo = require('../config/repository');
const { broadcastPriceTrend } = require('../wsBroadcaster');

const aggregatePriceTrends = async () => {
  try {
    const activeAndRecentLots = await repo.getLots({});
    const fishGroups = {};

    activeAndRecentLots.forEach(lot => {
      if (!fishGroups[lot.fishType]) {
        fishGroups[lot.fishType] = [];
      }
      if (lot.currentPrice) {
        fishGroups[lot.fishType].push(lot.currentPrice / (lot.quantityKg || 1));
      }
    });

    const now = new Date();
    const createdTrends = [];

    for (const [fishType, prices] of Object.entries(fishGroups)) {
      if (prices.length > 0) {
        const sum = prices.reduce((a, b) => a + b, 0);
        const avgPricePerKg = parseFloat((sum / prices.length).toFixed(2));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const trend = await repo.createPriceTrend({
          fishType,
          timestamp: now,
          avgPricePerKg,
          minPrice: parseFloat(minPrice.toFixed(2)),
          maxPrice: parseFloat(maxPrice.toFixed(2)),
          sampleCount: prices.length
        });

        createdTrends.push(trend);
        broadcastPriceTrend(trend);
      }
    }

    return createdTrends;
  } catch (err) {
    console.error('[Trend Aggregator Error]', err.message);
  }
};

const startTrendAggregatorService = (intervalMs = 300000) => { // Default 5 mins
  console.log(`[Trend Service] Aggregator started with ${intervalMs / 1000}s interval`);
  setInterval(aggregatePriceTrends, intervalMs);
};

module.exports = {
  aggregatePriceTrends,
  startTrendAggregatorService
};
