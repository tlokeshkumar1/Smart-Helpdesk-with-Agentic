export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    const e = new Error('Forbidden');
    e.status = 403;
    e.publicMessage = 'Forbidden';
    return next(e);
  }
  next();
};
