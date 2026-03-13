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
            const chunk = (part && (part as any).message && (part as any).message.content) ?? (part as any)?.response ?? '';
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
    console.log("waiting  for response");
    const content = req.body;
    if (!Array.isArray(content)) {
        return resp.status(400).json({ error: "Invalid request body: expected array of strings" });
    }
    const messageArray: Message[] = [];
    for (let x = 0; x < content.length; x++) {
        if (typeof content[x] !== 'string') {
            return resp.status(400).json({ error: `Invalid message at index ${x}: expected string` });
        }
        let parsed;
        try {
            parsed = JSON.parse(content[x]);
        } catch (e) {
            return resp.status(400).json({ error: `Failed to parse message history at index ${x}` });
        }
        if (!parsed || typeof parsed !== 'object' || !parsed.role || !parsed.content) {
            return resp.status(400).json({ error: `Invalid message structure at index ${x}` });
        }
        const role = String(parsed.role);
        if (role !== 'user' && role !== 'assistant' && role !== 'system') {
            return resp.status(400).json({ error: `Invalid role at index ${x}: ${role}` });
        }
        messageArray.push({
            role: role as "user" | "assistant" | "system",
            content: String(parsed.content)
        });
    }
    console.log(`request body ${JSON.stringify(messageArray)}`);
    
    const config = await configService.getConfig();
    const aiService = await getAIService();
    const response = await aiService.chat({
        model: config.defaultModel || 'codellama:latest',
        messages: messageArray,
        stream: true,
    });
    
    await streamAIResponse(req, resp, response);
}