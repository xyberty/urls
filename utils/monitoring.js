const logger = require('./logger');

const startMonitoring = () => {
  // Monitor memory usage
  setInterval(() => {
    const used = process.memoryUsage();
    logger.info({
      type: 'memory_usage',
      rss: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`
    });
  }, 300000); // Every 5 minutes

  // Monitor unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Monitor uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

module.exports = startMonitoring; 