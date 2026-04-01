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

export interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  isError?: boolean;
}

/**
 * Component to display a single message in the chat interface.
 * @param props The component properties.
 * @returns The rendered ChatMessage component.
 */
export default function ChatMessage({ role, content, isError }: ChatMessageProps) {
  const isUser = role === "user";
  const isEmpty = !content || content.trim() === "";

  return (
    <div className={`max-w-3xl ${isUser ? "ml-auto" : "mr-auto"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`
        ${isUser ? "bg-blue-600 text-white" : isError ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-gray-900 border-gray-200"} 
        rounded-xl px-4 py-3 shadow-sm border
      `}>
        {isEmpty && !isUser ? (
          <div className="flex items-center space-x-2 text-gray-400 italic py-1">
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">AI is thinking...</span>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">{content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
