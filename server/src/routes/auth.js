import { Router } from 'express';
import Joi from 'joi';
import { User } from '../models/User.js';
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwt.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

export const auth = Router();

const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'agent', 'user').default('user')
  })
});

auth.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    
    const user = new User({ name, email, role });
    await user.setPassword(password);
    await user.save();
    
    const access = signAccess({ sub: String(user._id), role: user.role });
    const refresh = signRefresh({ sub: String(user._id), role: user.role });
    
    res.json({ 
      token: access, 
      refreshToken: refresh, 
      user: { id: user._id, name, email, role } 
    });
  } catch (e) { 
    next(e); 
  }
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
});

auth.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      const err = new Error('Invalid credentials'); 
      err.status = 401; 
      err.publicMessage = 'Invalid credentials'; 
      throw err;
    }
    
    const access = signAccess({ sub: String(user._id), role: user.role });
    const refresh = signRefresh({ sub: String(user._id), role: user.role });
    
    res.json({ 
      token: access, 
      refreshToken: refresh, 
      user: { id: user._id, name: user.name, email, role: user.role } 
    });
  } catch (e) { 
    next(e); 
  }
});

auth.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const token = req.body.refreshToken;
    if (!token) return res.status(400).json({ message: 'Missing refreshToken' });
    
    const payload = verifyRefresh(token);
    const access = signAccess({ sub: payload.sub, role: payload.role });
    
    res.json({ token: access });
  } catch (e) { 
    e.status = 401; 
    e.publicMessage = 'Invalid refresh token'; 
    next(e); 
  }
});
