import React from "react";
import Button from "./Button";
import ChatMessage from "./ChatMessage";
import { Message } from "../../types/chat";

interface ChatViewProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

const ChatView: React.FC<ChatViewProps> = ({
  messages,
  inputValue,
  setInputValue,
  sending,
  onSend,
  onCancel,
  chatContainerRef,
}) => {
  const charCount = inputValue.length;

  return (
    <>
      {/* Chat container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4" data-testid="chat-container">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm mt-1">Ask me anything and I'll help you out!</p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <ChatMessage 
              key={idx} 
              role={m.role} 
              content={m.content} 
              isError={m.isError} 
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
              style={{ paddingRight: "3.5rem" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button
              variant="primary"
              size="icon"
              className="absolute right-2 bottom-2"
              onClick={onSend}
              disabled={sending || !inputValue.trim()}
              title="Send message"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={!sending}
            title="Cancel the current AI request"
          >
            Cancel
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="text-gray-400">{charCount} characters</span>
        </div>
      </div>
    </>
  );
};

export default ChatView;
