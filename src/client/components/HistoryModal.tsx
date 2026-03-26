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
