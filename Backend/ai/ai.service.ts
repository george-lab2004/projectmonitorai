import { GoogleGenerativeAI } from "@google/generative-ai";
import { functionDefinitions } from "./ai.definitions.js";
import type { Response } from "express";
import { User } from "../models/user.model.js";
import { aiFunctionsExecutors } from "./ai.functions.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro"
] as const;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const SYSTEM_INSTRUCTION = `
You are Project Monitor AI Analyst, an intelligent coordinator designed to help project managers and team members analyze, track, and assess project health, task deadlines, developer workloads, and team performance.

═══════════════════════════════════════════
YOUR MISSION & IDENTITY
═══════════════════════════════════════════

1. MISSION: Your primary task is to provide accurate statistics, performance reviews, status reports, risk assessments, and workload distributions from the project database.
2. IDENTITY: You speak with authority, clarity, and professionalism. You are a tech project coordinator who understands development sprint cycles, task dependencies, deadlines, and project statuses.
3. DATA COMPLIANCE: Do not invent details. Rely strictly on the provided tools to fetch database records. Never guess or hallucinate MongoDB ObjectIds.

═══════════════════════════════════════════
GOLDEN RULES — NEVER BREAK THESE
═══════════════════════════════════════════

1. NO ID ASSUMPTION: Never ask the user for a project ID or user ID. Always find them dynamically by calling:
   - "getProjectList" (to match a project title to a projectId)
   - "getUserList" (to match a user/developer name to a memberId)
   If a user asks about "Website Redesign" or "Sarah", lookup their IDs first using these tools, then use the ID to query the specific metrics.

2. LOGICAL TOOL SEQUENCING:
   - When asked about project health: first get the ID using getProjectList, then call getProjectHealth or generateProjectHealth.
   - When asked about overdue tasks: first get the ID, then call getOverdueTasks with the optional projectId.
   - When asked about workloads: first get the ID, then call getTeamWorkload or getWorkloadAlerts.
   - When asked about performance: look up the user list using getUserList, resolve the name to a memberId, and call getMemberPerformance.

3. AUTOMATIC EXECUTION: Call the tools immediately when needed. Do not explain that you are calling a tool or ask "Would you like me to do that?". Just call it.

4. RESPONSE STYLE:
   - Present details in clean, readable Markdown tables or bullet lists.
   - Summarize findings like an expert project director: highlight bottlenecks, flag team members with high workloads, and recommend realistic timelines.
`;

const createModelInstance = (model: string) =>
    genAI.getGenerativeModel({
        model,
        tools: [{ functionDeclarations: functionDefinitions }],
        systemInstruction: SYSTEM_INSTRUCTION,
    });

export const createChatModel = async (req: any, res: Response) => {
    const { message, history = [] } = req.body;
    const userId = req.user._id;

    let modelIndex = 0;
    let lastError: any = null;

    while (modelIndex < MODELS.length) {
        const currentModel = MODELS[modelIndex];
        if (!currentModel) break;

        try {
            const instance = createModelInstance(currentModel);
            const chat = instance.startChat({ history });
            const result = await chat.sendMessage(message);
            const response = result.response;
            const part = response.candidates?.[0]?.content?.parts?.[0];

            let finalTextMessage = "";
            let isFunctionCall = false;
            let functionData = null;
            let functionName = "";

            if (part?.functionCall) {
                isFunctionCall = true;
                const { name, args } = part.functionCall;
                functionName = name;

                const executor = aiFunctionsExecutors[name as keyof typeof aiFunctionsExecutors];
                if (!executor) {
                    return res.status(400).json({ message: `Unknown AI function: ${name}` });
                }

                const data = await (executor as Function)(args);
                functionData = data;

                const final = await chat.sendMessage([{
                    functionResponse: {
                        name,
                        response: { result: data },
                    },
                }]);

                finalTextMessage = final.response.text();
            } else {
                finalTextMessage = response.text();
            }

            try {
                await User.findByIdAndUpdate(userId, {
                    $inc: { aiUsageCount: 1 },
                    $set: { lastAiMessage: message }
                });
            } catch (statError) {
                console.error("[AI Stats] Failed to update user usage:", statError);
            }

            if (isFunctionCall) {
                return res.json({
                    type: "data",
                    functionCalled: functionName,
                    data: functionData,
                    message: finalTextMessage,
                    model: currentModel,
                });
            } else {
                return res.json({
                    type: "text",
                    message: finalTextMessage,
                    model: currentModel,
                });
            }

        } catch (err: any) {
            lastError = err;

            const isQuota = err?.status === 429 || err?.message?.includes("429") || err?.message?.toLowerCase().includes("quota");
            const isOverloaded = err?.status === 503 || err?.message?.includes("503") || err?.message?.toLowerCase().includes("overloaded");
            const isNotFound = err?.status === 404 || err?.message?.toLowerCase().includes("not found");

            if (isQuota || isOverloaded) {
                if (modelIndex < MODELS.length - 1) {
                    console.warn(`[AI] ${currentModel} ${isQuota ? 'rate limited' : 'overloaded'} → falling back to ${MODELS[modelIndex + 1]}`);
                    modelIndex++;
                    await sleep(500);
                    continue;
                }
                lastError = new Error(isQuota ? "QUOTA_EXHAUSTED" : "MODEL_OVERLOADED");
                break;
            }

            if (isNotFound) {
                console.error(`[AI] Model "${currentModel}" not found → skipping`);
                modelIndex++;
                continue;
            }

            break;
        }
    }

    console.error("[AI] All models failed:", lastError?.message);

    if (lastError?.message === "QUOTA_EXHAUSTED") {
        return res.status(429).json({
            message: "Project Monitor AI is out of daily API credits right now. Please try again later!",
            error: "QUOTA_EXHAUSTED"
        });
    }

    if (lastError?.message === "MODEL_OVERLOADED") {
        return res.status(503).json({
            message: "The AI system is experiencing high traffic volumes. Please wait a brief moment and retry.",
            error: "MODEL_OVERLOADED"
        });
    }

    return res.status(500).json({
        message: lastError?.message || "AI service is temporarily unavailable. Please try again.",
    });
};