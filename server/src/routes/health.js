import { Router } from 'express';

export const health = Router();

health.get('/healthz', (req, res) => res.json({ ok: true }));
health.get('/readyz', (req, res) => res.json({ ready: true }));
