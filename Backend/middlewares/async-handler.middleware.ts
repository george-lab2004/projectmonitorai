import type { Request, Response, NextFunction, RequestHandler } from "express"

type AsyncFn<T = Request> = (req: T, res: Response, next: NextFunction) => Promise<any>

export const asyncHandler = <T = Request>(fn: AsyncFn<T>): RequestHandler =>
    (req, res, next) => {
        Promise.resolve(fn(req as T, res, next)).catch(next)
    }