const { ValidationError } = require('../utils/errors');

/**
 * Validates req.body / req.query / req.params against Zod schemas and
 * replaces them with the parsed (and coerced/defaulted) values.
 *
 * Usage: validate({ body: createWordSchema, query: listQuerySchema })
 */
function validate(schemas) {
  return function validateRequest(req, res, next) {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      return next();
    } catch (err) {
      if (err.issues) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return next(new ValidationError('Invalid request', details));
      }
      return next(err);
    }
  };
}

module.exports = validate;
