import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ApiError } from './errorHandler';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(new ApiError(400, `Validation error: ${JSON.stringify(errors)}`));
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(new ApiError(400, `Query validation error: ${JSON.stringify(errors)}`));
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(new ApiError(400, `Params validation error: ${JSON.stringify(errors)}`));
      }
      next(error);
    }
  };
};
