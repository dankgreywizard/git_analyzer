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
import { useState, useEffect } from "react";
import { Chat, Message } from "../../types/chat";

/**
 * Hook for managing the persistence and retrieval of chat history from local storage.
 * @returns A tuple containing the chat history, its setter, and a save function.
 */
export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatHistory");
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    } catch {}
  }, [chatHistory]);

  /**
   * Saves a chat session to the history.
   * @param id The unique identifier for the chat session.
   * @param messages The list of messages in the chat session.
   */
  const saveChat = (id: string, messages: Message[]) => {
    setChatHistory((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === id);
      const chat: Chat = { id, messages };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = chat;
        return copy;
      }
      return [chat, ...prev];
    });
  };

  return [chatHistory, setChatHistory, saveChat] as const;
}
