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
import Modal from "./Modal";
import ChatHistory from "./ChatHistory";
import { Chat } from "../../types/chat";

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelect: (id: string) => void;
  onPreview: (chat: Chat) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

/**
 * Modal dialog for displaying and managing past chat conversations.
 * @param props The component properties.
 * @returns The rendered HistoryModal component.
 */
const HistoryModal: React.FC<HistoryModalProps> = ({
  open,
  onClose,
  chats,
  currentChatId,
  onSelect,
  onPreview,
  onDelete,
  onNewChat,
}) => {
  return (
    <Modal
      open={open}
      title="Past Conversations"
      onClose={onClose}
    >
      <div className="max-h-[60vh] overflow-hidden flex flex-col -mx-6 -my-6">
        <ChatHistory
          chats={chats}
          currentChatId={currentChatId}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
          onPreview={onPreview}
          onDelete={onDelete}
          onNewChat={() => {
            onNewChat();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};

export default HistoryModal;
