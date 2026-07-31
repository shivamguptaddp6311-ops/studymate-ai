import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

export interface StructuredValidationErrorResponse {
  error: "Validation Error";
  message: string;
  details: ValidationErrorDetail[];
}

/**
 * Centralized request validation middleware.
 * Validates body, query, params, and attachments against provided Zod schemas.
 * Returns structured error details and status 400 for malformed requests.
 * Minimizes runtime overhead with direct safeParse execution.
 */
export function validateRequest(schemas: RequestValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errorDetails: ValidationErrorDetail[] = [];

    // Validate request body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const pathStr = issue.path.join(".");
          errorDetails.push({
            field: pathStr ? `body.${pathStr}` : "body",
            message: issue.message,
            code: issue.code
          });
        });
      } else {
        req.body = result.data;
      }
    }

    // Validate request query parameters
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const pathStr = issue.path.join(".");
          errorDetails.push({
            field: pathStr ? `query.${pathStr}` : "query",
            message: issue.message,
            code: issue.code
          });
        });
      } else {
        req.query = result.data as any;
      }
    }

    // Validate route URL parameters
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const pathStr = issue.path.join(".");
          errorDetails.push({
            field: pathStr ? `params.${pathStr}` : "params",
            message: issue.message,
            code: issue.code
          });
        });
      } else {
        req.params = result.data as any;
      }
    }

    // Validate headers if specified
    if (schemas.headers) {
      const result = schemas.headers.safeParse(req.headers);
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const pathStr = issue.path.join(".");
          errorDetails.push({
            field: pathStr ? `headers.${pathStr}` : "headers",
            message: issue.message,
            code: issue.code
          });
        });
      }
    }

    // If validation failed, reject request with structured 400 error
    if (errorDetails.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid request payload or parameters",
        details: errorDetails
      } as StructuredValidationErrorResponse);
    }

    next();
  };
}
