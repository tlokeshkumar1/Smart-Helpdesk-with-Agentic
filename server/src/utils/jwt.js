import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signAccess = (payload) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const signRefresh = (payload) =>
  jwt.sign(payload, config.refreshSecret, { expiresIn: config.refreshExpiresIn });

export const verifyAccess = (token) => jwt.verify(token, config.jwtSecret);

export const verifyRefresh = (token) => jwt.verify(token, config.refreshSecret);
