const { cleanupExpired } = require('./fileService');

let cleanupInterval = null;

function startCleanupJob(intervalMinutes = 10) {
  if (cleanupInterval) return;

  const ms = intervalMinutes * 60 * 1000;
  cleanupInterval = setInterval(() => {
    try {
      const removed = cleanupExpired();
      if (removed > 0) {
        console.log(`[Cleanup] Successfully removed ${removed} expired temporary file(s).`);
      }
    } catch (err) {
      console.error('[Cleanup] Error during periodic cleanup:', err.message);
    }
  }, ms);

  // Avoid preventing node process from exiting in test runners
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  console.log(`[Cleanup] Background file retention job scheduled every ${intervalMinutes} minutes.`);
}

function stopCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

module.exports = {
  startCleanupJob,
  stopCleanupJob,
};
