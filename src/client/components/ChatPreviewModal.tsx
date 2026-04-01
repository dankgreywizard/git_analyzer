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
import { Chat } from "../../types/chat";

interface ChatPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  chat: Chat | null;
}

/**
 * Modal dialog for previewing the contents of a past chat session.
 * @param props The component properties.
 * @returns The rendered ChatPreviewModal component.
 */
const ChatPreviewModal: React.FC<ChatPreviewModalProps> = ({
  open,
  onClose,
  onContinue,
  chat,
}) => {
  return (
    <Modal
      open={open}
      title="Chat History"
      onClose={onClose}
      onContinue={onContinue}
    >
      {chat?.messages?.length ? (
        <div className="space-y-3">
          {chat.messages.map((m, i) => (
            <div key={i} className="text-sm">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800">
                {m.content}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-600">No messages to display.</div>
      )}
    </Modal>
  );
};

export default ChatPreviewModal;
