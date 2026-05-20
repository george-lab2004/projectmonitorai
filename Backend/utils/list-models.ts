import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const test = async () => {
    try {
        const key = process.env.GEMINI_API_KEY!;
        console.log("Using API Key:", key);
        const genAI = new GoogleGenerativeAI(key);
        // Try listing models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        const json = await response.json();
        console.log("Raw Response status:", response.status);
        console.log("Raw Response body:", JSON.stringify(json, null, 2));
    } catch (err: any) {
        console.error("Error testing key:", err);
    }
};

test();
