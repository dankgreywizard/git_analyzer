/**
 * Copyright 2026 Robert Wheeler(dankgreywizard)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
import {Request, Response} from "express";
import { Message } from "../types/chat";
import { getAIService } from "./aiService";
import { configService } from "./configService";

/**
 * Streams AI response to the client with cancellation and error handling.
 * @param req Express request object.
 * @param res Express response object.
 * @param stream The AI response stream.
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
        for await (const streamChunk of stream) {
            if (isCancelled) {
                console.log('Stopping AI stream due to client disconnection');
                break;
            }
            const chunk = (streamChunk && (streamChunk as any).message && (streamChunk as any).message.content) ?? (streamChunk as any)?.response ?? (streamChunk as any)?.content ?? '';
            if (chunk) {
                res.write(chunk);
            }
        }
        if (!isCancelled) res.end();
    } catch (streamError: any) {
        console.error("Error during AI response streaming:", streamError);
        if (res.headersSent) {
            res.write(`\n[Streaming error: ${streamError?.message || String(streamError)}]\n`);
            res.end();
        } else {
            res.status(500).json({ error: `AI error: ${streamError?.message || String(streamError)}` });
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
    for (let index = 0; index < content.length; index++) {
        const messageItem = content[index];
        console.log(`Processing message at index ${index}, type: ${typeof messageItem}`);
        let parsed: any = null;
        if (typeof messageItem === 'string') {
            try {
                parsed = JSON.parse(messageItem);
            } catch (parseError) {
                console.error(`Failed to parse message history at index ${index}: ${messageItem}`);
                return resp.status(400).json({ error: `Failed to parse message history at index ${index}` });
            }
        } else if (typeof messageItem === 'object' && messageItem !== null) {
            parsed = messageItem;
        } else {
            console.error(`Invalid message at index ${index}: expected string or object, got ${typeof messageItem}`);
            return resp.status(400).json({ error: `Invalid message at index ${index}: expected string or object` });
        }

        if (!parsed || typeof parsed !== 'object' || !parsed.role || !parsed.content) {
            console.error(`Invalid message structure at index ${index}:`, parsed);
            return resp.status(400).json({ error: `Invalid message structure at index ${index}` });
        }
        const role = String(parsed.role);
        if (role !== 'user' && role !== 'assistant' && role !== 'system') {
            console.error(`Invalid role at index ${index}: ${role}`);
            return resp.status(400).json({ error: `Invalid role at index ${index}: ${role}` });
        }
        messageArray.push({
            role: role as "user" | "assistant" | "system",
            content: String(parsed.content).trim()
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
    } catch (aiServiceError: any) {
        console.error("Error calling AI service:", aiServiceError);
        if (!resp.headersSent) {
            resp.status(500).json({ error: `AI service error: ${aiServiceError?.message || String(aiServiceError)}` });
        } else {
            resp.write(`\n[AI service error: ${aiServiceError?.message || String(aiServiceError)}]\n`);
            resp.end();
        }
    }
}