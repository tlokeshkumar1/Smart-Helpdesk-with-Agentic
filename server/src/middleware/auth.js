import { verifyAccess } from '../utils/jwt.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    
    const payload = verifyAccess(token);
    req.user = await User.findById(payload.sub).lean();
    
    if (!req.user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    
    next();
  } catch (err) {
    err.status = err.status || 401;
    err.publicMessage = 'Unauthorized';
    next(err);
  }
}
