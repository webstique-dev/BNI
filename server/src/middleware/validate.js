import { z } from 'zod';

/**
 * Express middleware helper to validate request body/query/params using Zod schema
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed & sanitized data back
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join('.').replace(/^(body|query|params)\./, ''),
          message: i.message,
        }));

        return res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Validation error',
          errors: issues,
        });
      }
      next(error);
    }
  };
}
