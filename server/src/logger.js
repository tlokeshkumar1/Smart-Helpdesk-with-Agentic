import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => (err || res.statusCode >= 500 ? 'error' : 'info'),
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url }; },
    res(res) { return { statusCode: res.statusCode }; }
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  }
});
