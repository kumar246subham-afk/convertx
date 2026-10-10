const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { startCleanupJob, stopCleanupJob } = require('./services/cleanupService');
const { ensureDir } = require('./utils/helpers');

// Ensure necessary directories exist
ensureDir(env.UPLOADS_DIR);
ensureDir(env.PROCESSED_DIR);

async function start() {
  // Connect to DB if configured
  await connectDB();

  // Start periodic file retention cleanup
  startCleanupJob(env.FILE_RETENTION_MINUTES);

  const server = app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 ConvertX Server running on port ${env.PORT}`);
    console.log(`📡 API Base: http://localhost:${env.PORT}/api/v1`);
    console.log(`🛡️  Mode: ${env.NODE_ENV}`);
    console.log(`===============================================`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down ConvertX gracefully...');
    stopCleanupJob();
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[Server Fatal] Failed to bootstrap application:', err);
  process.exit(1);
});
