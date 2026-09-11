/**
 * Benchmarking Request Logger Middleware
 * Logs high-resolution timestamps and request execution duration (ms)
 * to facilitate JMeter performance/latency benchmarking analysis.
 */

const loggerMiddleware = (req, res, next) => {
  const start = process.hrtime();
  const startTimeISO = new Date().toISOString();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
    console.log(`[BENCHMARK] ${startTimeISO} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Latency: ${timeInMs} ms`);
  });

  next();
};

module.exports = loggerMiddleware;
