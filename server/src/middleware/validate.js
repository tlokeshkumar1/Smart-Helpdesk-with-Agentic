export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(
    { body: req.body, params: req.params, query: req.query },
    { abortEarly: false, stripUnknown: true }
  );
  
  if (error) {
    const e = new Error('ValidationError');
    e.status = 400;
    e.publicMessage = error.details.map(d => d.message).join(', ');
    return next(e);
  }
  
  req.body = value.body || req.body;
  req.params = value.params || req.params;
  req.query = value.query || req.query;
  
  return next();
};
