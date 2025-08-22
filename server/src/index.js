import { connectDb } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

(async () => {
  try {
    await connectDb();
    const app = createApp();
    app.listen(config.port, () => logger.info(`API listening on :${config.port}`));
  } catch (e) {
    logger.error(e, 'Failed to start');
    process.exit(1);
  }
})();
