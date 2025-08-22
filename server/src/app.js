import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import requestLogger from './middleware/requestLogger.js';
import { errorHandler } from './middleware/error.js';
import { health } from './routes/health.js';
import { auth } from './routes/auth.js';
import { kb } from './routes/kb.js';
import { tickets } from './routes/tickets.js';
import { agent } from './routes/agent.js';
import { cfg } from './routes/config.js';
import { audit } from './routes/audit.js';
import { notifications } from './routes/notifications.js';
import replies from './routes/replies.js';
import { writeLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  app.use(requestLogger);
  app.use(morgan('tiny'));

  app.use('/api', health);
  app.use('/api/auth', auth);
  app.use('/api/kb', kb);
  app.use('/api/tickets', writeLimiter, tickets);
  app.use('/api/agent', agent);
  app.use('/api/config', cfg);
  app.use('/api/notifications', notifications);
  app.use('/api/replies', replies);
  app.use('/api', audit);

  app.use('*', (req, res) => res.status(404).json({ message: 'Not found' }));
  app.use(errorHandler);

  return app;
}
