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
import { useState, useCallback, useRef } from "react";
import { Message } from "../../types/chat";

/**
 * Hook for managing chat state and operations.
 * Handles message history, sending messages to the AI service, and streaming responses.
 * @returns An object containing chat state and operation functions.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Adds a message to the chat history.
   * @param role The role of the message sender.
   * @param content The content of the message.
   */
  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  /**
   * Cancels the current AI request.
   */
  const handleCancel = useCallback(() => {
    const controller = abortRef.current;
    if (controller) controller.abort();
  }, []);

  /**
   * Streams the AI response from a Fetch API Response object.
   * @param response The Fetch API Response object.
   * @param controller The AbortController for the request.
   * @param onUpdateStatus Callback to update the application status.
   * @param scrollToBottom Callback to scroll the chat to the bottom.
   * @param onSuccess Callback to execute on successful completion.
   */
  const streamResponse = useCallback(async (
    response: Response,
    controller: AbortController,
    onUpdateStatus?: (text: string, color: "gray" | "yellow" | "green" | "red") => void,
    scrollToBottom?: () => void,
    onSuccess?: () => void
  ) => {
    onUpdateStatus?.("Streaming...", "yellow");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Streaming not supported");
    const decoder = new TextDecoder();
    let aiText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiText += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: aiText };
        }
        return updated;
      });
      scrollToBottom?.();
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
      aiText += finalChunk;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: aiText };
        }
        return updated;
      });
    }

    setSending(false);
    onUpdateStatus?.("Ready", "green");
    scrollToBottom?.();
    onSuccess?.();
  }, []);

  /**
   * Handles errors during AI requests.
   * @param errorMsg The error message.
   * @param controller The AbortController for the request.
   * @param onUpdateStatus Callback to update the application status.
   * @param isAnalysis Whether the error occurred during a commit analysis request.
   */
  const handleError = useCallback((
    errorMsg: string,
    controller: AbortController,
    onUpdateStatus?: (text: string, color: "gray" | "yellow" | "green" | "red") => void,
    isAnalysis: boolean = false
  ) => {
    if (controller.signal.aborted) {
      onUpdateStatus?.("Cancelled", "yellow");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } else {
      console.error(errorMsg);
      onUpdateStatus?.("Error", "red");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const updated = [...prev];
        const errorContent = isAnalysis ? `Analysis Error: ${errorMsg}` : `Error: ${errorMsg}`;
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { role: "assistant", content: errorContent, isError: true };
        } else {
          updated.push({ role: "assistant", content: errorContent, isError: true });
        }
        return updated;
      });
    }
    setSending(false);
  }, []);

  /**
   * Sends a chat message to the AI service.
   * @param userInput The message content.
   * @param onSuccess Callback to execute on successful completion.
   * @param onUpdateStatus Callback to update the application status.
   * @param scrollToBottom Callback to scroll the chat to the bottom.
   */
  const sendMessage = useCallback(async (
    userInput: string, 
    onSuccess?: () => void, 
    onUpdateStatus?: (text: string, color: "gray" | "yellow" | "green" | "red") => void,
    scrollToBottom?: () => void
  ) => {
    if (!userInput || sending) return;

    addMessage("user", userInput);
    setSending(true);
    onUpdateStatus?.("Sending...", "yellow");

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = messages.concat({ role: "user", content: userInput }).map((message) => {
        const { role, content } = message;
        return { role, content };
      });
      console.log("Sending chat request:", payload);
      const response = await fetch("/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      console.log(`Chat response status: ${response.status} ${response.statusText}`);
      if (response.ok) {
        await streamResponse(response, controller, onUpdateStatus, scrollToBottom, onSuccess);
      } else {
        const errorMsg = response.statusText || `Request failed with status ${response.status}`;
        console.error("Chat request failed:", response.status, errorMsg);
        handleError(errorMsg, controller, onUpdateStatus);
      }
    } catch (error: any) {
      console.error("Chat request error:", error);
      handleError(error?.message || String(error), controller, onUpdateStatus);
    } finally {
      abortRef.current = null;
    }
  }, [messages, sending, addMessage, streamResponse, handleError]);

  /**
   * Sends a request to analyze Git commits with AI.
   * @param userMsg The user's message describing the analysis request.
   * @param payload The request payload containing commit information and model selection.
   * @param onUpdateStatus Callback to update the application status.
   * @param scrollToBottom Callback to scroll the chat to the bottom.
   */
  const sendAnalysisRequest = useCallback(async (
    userMsg: string,
    payload: any,
    onUpdateStatus?: (text: string, color: "gray" | "yellow" | "green" | "red") => void,
    scrollToBottom?: () => void
  ) => {
    addMessage('user', userMsg);
    setSending(true);
    onUpdateStatus?.('Analyzing commits...', 'yellow');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      console.log("Sending analysis request:", payload);
      const response = await fetch('/api/analyze-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      console.log(`Analysis response status: ${response.status} ${response.statusText}`);
      if (response.ok) {
        await streamResponse(response, controller, onUpdateStatus, scrollToBottom);
      } else {
        const errorMsg = (await response.text()) || `Analyze failed with status ${response.status}`;
        console.error("Analysis request failed:", response.status, errorMsg);
        handleError(errorMsg, controller, onUpdateStatus, true);
      }
    } catch (error: any) {
      console.error("Analysis request error:", error);
      handleError(error?.message || String(error), controller, onUpdateStatus, true);
    } finally {
      abortRef.current = null;
    }
  }, [addMessage, streamResponse, handleError]);

  return {
    messages,
    setMessages,
    sending,
    handleCancel,
    sendMessage,
    sendAnalysisRequest,
    addMessage
  };
}
