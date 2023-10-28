import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validateMiddleware(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    res.status(400).json({ errors: errors.array() });
}