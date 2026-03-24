import {Request, Response} from "express";
import { Message } from "../types/chat";
import { getAIService } from "./aiService";
import { configService } from "./configService";

/**
 * Streams AI response to the client with cancellation and error handling.
 */
export const streamAIResponse = async (req: Request, res: Response, stream: any) => {
    let isCancelled = false;
    req.on('close', () => {
        isCancelled = true;
        console.log('Client disconnected from AI stream');
    });

    try {
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        for await (const part of stream) {
            if (isCancelled) {
                console.log('Stopping AI stream due to client disconnection');
                break;
            }
            const chunk = (part && (part as any).message && (part as any).message.content) ?? (part as any)?.response ?? (part as any)?.content ?? '';
            if (chunk) {
                res.write(chunk);
            }
        }
        if (!isCancelled) res.end();
    } catch (e: any) {
        console.error("Error during AI response streaming:", e);
        if (res.headersSent) {
            res.write(`\n[Streaming error: ${e?.message || String(e)}]\n`);
            res.end();
        } else {
            res.status(500).json({ error: `AI error: ${e?.message || String(e)}` });
        }
    }
};

/**
 * Handles chat requests by communicating with the chosen AI service.
 * Streams the response chunks back to the client.
 * @param req Express request object containing the message history.
 * @param resp Express response object to stream the reply.
 */
export const ollamaResponse = async (req: Request, resp: Response) => {
    console.log("Waiting for AI response from ollamaResponse endpoint...");
    const content = req.body;
    console.log(`Request body type: ${typeof content}, isArray: ${Array.isArray(content)}`);
    if (!Array.isArray(content)) {
        console.error("Invalid request body: expected array", content);
        return resp.status(400).json({ error: "Invalid request body: expected array of objects or strings" });
    }
    const messageArray: Message[] = [];
    for (let x = 0; x < content.length; x++) {
        let item = content[x];
        console.log(`Processing message at index ${x}, type: ${typeof item}`);
        let parsed: any = null;
        if (typeof item === 'string') {
            try {
                parsed = JSON.parse(item);
            } catch (e) {
                console.error(`Failed to parse message history at index ${x}: ${item}`);
                return resp.status(400).json({ error: `Failed to parse message history at index ${x}` });
            }
        } else if (typeof item === 'object' && item !== null) {
            parsed = item;
        } else {
            console.error(`Invalid message at index ${x}: expected string or object, got ${typeof item}`);
            return resp.status(400).json({ error: `Invalid message at index ${x}: expected string or object` });
        }

        if (!parsed || typeof parsed !== 'object' || !parsed.role || !parsed.content) {
            console.error(`Invalid message structure at index ${x}:`, parsed);
            return resp.status(400).json({ error: `Invalid message structure at index ${x}` });
        }
        const role = String(parsed.role);
        if (role !== 'user' && role !== 'assistant' && role !== 'system') {
            console.error(`Invalid role at index ${x}: ${role}`);
            return resp.status(400).json({ error: `Invalid role at index ${x}: ${role}` });
        }
        messageArray.push({
            role: role as "user" | "assistant" | "system",
            content: String(parsed.content)
        });
    }
    console.log(`Request messages: ${JSON.stringify(messageArray, null, 2)}`);
    
    try {
        const config = await configService.getConfig();
        const aiService = await getAIService();
        
        // Ensure system prompt is prepended if not already present
        const messagesWithSystem: Message[] = [...messageArray];
        const hasSystem = messagesWithSystem.some(m => m.role === 'system');
        if (!hasSystem && config.systemPrompt) {
            messagesWithSystem.unshift({ role: 'system', content: config.systemPrompt });
        }

        console.log(`Using AI model: ${config.defaultModel || 'codellama:latest'} with timeout: ${config.timeout}ms`);
        const response = await aiService.chat({
            model: config.defaultModel || 'codellama:latest',
            messages: messagesWithSystem,
            stream: true,
            timeout: config.timeout,
        });
        
        await streamAIResponse(req, resp, response);
    } catch (e: any) {
        console.error("Error calling AI service:", e);
        if (!resp.headersSent) {
            resp.status(500).json({ error: `AI service error: ${e?.message || String(e)}` });
        } else {
            resp.write(`\n[AI service error: ${e?.message || String(e)}]\n`);
            resp.end();
        }
    }
}