import { useState, useCallback, useRef } from "react";
import { Message } from "../../types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const handleCancel = useCallback(() => {
    const ctrl = abortRef.current;
    if (ctrl) ctrl.abort();
  }, []);

  const streamResponse = useCallback(async (
    res: Response,
    controller: AbortController,
    onUpdateStatus?: (text: string, color: "gray" | "yellow" | "green" | "red") => void,
    scrollToBottom?: () => void,
    onSuccess?: () => void
  ) => {
    onUpdateStatus?.("Streaming...", "yellow");
    const reader = res.body?.getReader();
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
      const payload = messages.concat({ role: "user", content: userInput }).map((m) => {
        const { role, content } = m;
        return { role, content };
      });
      const res = await fetch("/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.ok) {
        await streamResponse(res, controller, onUpdateStatus, scrollToBottom, onSuccess);
      } else {
        const errorMsg = res.statusText || "Request failed";
        handleError(errorMsg, controller, onUpdateStatus);
      }
    } catch (e: any) {
      handleError(e?.message || String(e), controller, onUpdateStatus);
    } finally {
      abortRef.current = null;
    }
  }, [messages, sending, addMessage, streamResponse, handleError]);

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
      const res = await fetch('/api/analyze-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.ok) {
        await streamResponse(res, controller, onUpdateStatus, scrollToBottom);
      } else {
        const errorMsg = (await res.text()) || 'Analyze failed';
        handleError(errorMsg, controller, onUpdateStatus, true);
      }
    } catch (e: any) {
      handleError(e?.message || String(e), controller, onUpdateStatus, true);
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
