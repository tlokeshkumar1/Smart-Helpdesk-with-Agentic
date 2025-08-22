import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.REFRESH_SECRET,
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  agent: {
    baseUrl: process.env.AGENT_BASE_URL || 'http://localhost:9000',
    timeoutMs: Number(process.env.AGENT_TIMEOUT_MS || 8000),
    retry: Number(process.env.AGENT_RETRY || 2)
  },
  defaults: {
    autoCloseEnabled: process.env.AUTO_CLOSE_ENABLED === 'true',
    confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD || 0.78),
    slaHours: Number(process.env.SLA_HOURS || 24)
  }
};
