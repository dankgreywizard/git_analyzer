import React from "react";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

/**
 * Component to display a single message in the chat interface.
 */
export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={`max-w-3xl ${isUser ? "ml-auto" : "mr-auto"}`}>
      <div className={`${isUser ? "bg-blue-600 text-white" : "bg-white text-gray-900"} rounded-xl px-4 py-3 shadow-sm border ${isUser ? "border-blue-700" : "border-gray-200"}`}>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm">{content}</pre>
      </div>
    </div>
  );
}
