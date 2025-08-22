import { logger } from '../logger.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  
  if (status >= 500) logger.error({ err }, 'Unhandled error');
  
  const safe = {
    error: err.name || 'Error',
    message: err.publicMessage || 'Something went wrong'
  };
  
  res.status(status).json(safe);
}
