import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";

export const validate = (schema: Schema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(", ");
            res.status(400);
            throw new Error(errorMessage);
        }
        next();
    };
};
