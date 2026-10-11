import { buildApp } from './app.js';
import { config } from './config/env.js';
import { testDbConnection } from './config/database.js';
import { initDatabase } from './database/init.js';
import { OtpModel } from './models/otp.model.js';

function startOtpCleanupWorker() {
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Run on startup
  OtpModel.purgeExpiredOtps()
    .then((deleted) => {
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} expired/orphaned OTP records on startup.`);
      }
    })
    .catch((err: any) => {
      console.warn(`Initial OTP cleanup warning: ${err.message}`);
    });

  // Schedule hourly cleanup
  const interval = setInterval(async () => {
    try {
      const deleted = await OtpModel.purgeExpiredOtps();
      if (deleted > 0) {
        console.log(`🧹 Hourly OTP cleanup: purged ${deleted} expired records.`);
      }
    } catch (err: any) {
      console.warn(`Hourly OTP cleanup error: ${err.message}`);
    }
  }, ONE_HOUR_MS);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
}

async function bootstrap() {
  console.log(`Starting Reminder++ Backend in ${config.nodeEnv} mode (Fastify)...`);

  // Attempt database init if local/development
  try {
    await initDatabase();
  } catch (err: any) {
    console.warn(`Database auto-init skipped or failed: ${err.message}. Relying on existing tables.`);
  }

  // Verify connection pool
  await testDbConnection();

  // Start background maintenance jobs
  startOtpCleanupWorker();

  const app = await buildApp();

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`🚀 Reminder++ API listening on port ${config.port} (${config.appUrl})`);
  console.log(`👉 App Control endpoint: ${config.appUrl}/api/v1/app-control`);
  console.log(`👉 Health check: ${config.appUrl}/api/health`);

  // Graceful shutdown handlers
  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    try {
      await app.close();
      console.log('Server closed.');
    } catch (err) {
      console.error('Error during shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
