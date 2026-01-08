import {Request, Response} from "express";
import { Message } from "../types/chat";
import { getAIService } from "./aiService";

/**
 * Handles chat requests by communicating with the chosen AI service.
 * Streams the response chunks back to the client.
 * @param req Express request object containing the message history.
 * @param resp Express response object to stream the reply.
 */
export const ollamaResponse = async (req: Request, resp: Response) => {
    console.log("waiting  for response");
    const content: string[] = req.body;
    const messageArray: Message[] = [];
    for(let x=0; x < content.length; x++) {
          messageArray.push(JSON.parse(content[x]));
    }
    console.log(`request body ${JSON.stringify(messageArray)}`);
    
    const aiService = getAIService();
    const response = await aiService.chat({
        model: process.env.AI_MODEL || 'codellama:latest',
        messages: messageArray,
        stream: true,
    });
    
    console.log("returning response");
    // Stream chunks as they arrive
    // Ensure a text content type for incremental rendering
    resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const part of response) {
        const chunk = (part && (part as any).message && (part as any).message.content) ?? (part as any)?.response ?? '';
        if (chunk) {
            resp.write(chunk);
        }
    }
    resp.end();
}