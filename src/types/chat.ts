/**
 * Represents a single message in a chat conversation.
 */
export interface Message {
  /** The role of the message sender */
  role: "user" | "assistant";
  /** The text content of the message */
  content: string;
}

/**
 * Represents a chat session containing multiple messages.
 */
export interface Chat {
  /** Unique identifier for the chat session */
  id: string;
  /** Array of messages in this chat session */
  messages: Message[];
  /** Optional timestamp of the chat session */
  time?: number;
}
