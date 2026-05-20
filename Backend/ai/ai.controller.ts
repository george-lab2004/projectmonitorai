import { createChatModel } from "./ai.service.js";
import type { Response } from "express";

export const chatWithAI = async (req: any, res: Response) => {
    return createChatModel(req, res);
};