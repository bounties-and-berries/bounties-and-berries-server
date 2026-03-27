const { ApiError } = require('./errorHandler');

/**
 * Middleware to validate request data against a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {'body' | 'query' | 'params'} source - Request property to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const result = schema.safeParse(req[source]);
    
    if (!result.success) {
      const errorMessages = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new ApiError(`Validation failed: ${errorMessages.join(', ')}`, 401);
    }
    
    // Replace req[source] with parsed and transformed data
    req[source] = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validate };
