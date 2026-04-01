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
import React from "react";

import { Chat } from "../../types/chat";

interface ChatHistoryProps {
  chats?: Chat[];
  currentChatId?: string | null;
  onSelect?: (id: string) => void;
  onPreview?: (chat: Chat) => void;
  onDelete?: (id: string) => void;
  onNewChat?: () => void;
}

/**
 * Component to display and manage a list of past chat sessions.
 * @param props The component properties.
 * @returns The rendered ChatHistory component.
 */
export default function ChatHistory({
  chats = [],
  currentChatId,
  onSelect,
  onPreview,
  onDelete,
  onNewChat,
}: ChatHistoryProps) {
  return (
    <div className={`w-full bg-white flex flex-col h-full overflow-hidden`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">History</h2>
        <button
          className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
          onClick={onNewChat}
          title="Start new chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-xs text-gray-400 p-2">No saved chats</div>
        ) : (
          chats.map((c) => {
            const title = c.messages?.[0]?.content?.slice(0, 60) || "Chat";
            return (
              <div
                key={c.id}
                className={`group w-full px-3 py-2 rounded-lg border border-transparent hover:bg-gray-50 flex items-center justify-between ${
                  currentChatId === c.id ? "bg-gray-100 border-gray-200" : ""
                }`}
              >
                <button
                  className="flex-1 text-left truncate text-sm text-gray-700"
                  onClick={() => onSelect?.(c.id)}
                  title={title}
                >
                  {title}
                </button>
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    className="px-2 py-1 text-[10px] rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                    onClick={() => onPreview?.(c)}
                    title="Preview"
                  >
                    View
                  </button>
                  <button
                    className="px-2 py-1 text-[10px] rounded bg-red-100 hover:bg-red-200 text-red-700"
                    onClick={() => onDelete?.(c.id)}
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
