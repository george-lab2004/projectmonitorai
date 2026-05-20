import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "./async-handler.middleware.js";
import { User, type IUser } from "../models/user.model.js";

interface DecodedToken extends JwtPayload {
    userId: string;
}

// Extend Request interface to include user
interface CustomRequest extends Request {
    user?: IUser | null;
}

const protect = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    let token;
    token = req.cookies.jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
            req.user = await User.findById(decoded.userId).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error("Not authorized, token failed");
        }
    } else {
        res.status(401);
        throw new Error("Not authorized, no token");
    }
});

// manager middleware 
const manager = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'manager') {
        next();
    } else {
        res.status(401);
        throw new Error("Not authorized as manager");
    }
});


export { protect, manager };