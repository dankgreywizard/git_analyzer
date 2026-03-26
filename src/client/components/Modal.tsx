import React from "react";
import Button from "./Button";

export interface ModalProps {
  open: boolean;
  title: string;
  timestamp?: string;
  onClose?: () => void;
  children: React.ReactNode;
  onContinue?: () => void;
}

/**
 * A modal dialog component for displaying detailed information or history.
 */
export default function Modal({ open, title, timestamp, onClose, children, onContinue }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {timestamp ? <p className="text-sm text-gray-500 mt-1">{timestamp}</p> : null}
          </div>
          <div className="flex items-center space-x-2">
            {onContinue && (
              <Button variant="primary" onClick={onContinue} title="Restore this chat session and continue">
                Continue Chat
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} aria-label="Close modal" title="Close this preview">
              ✕
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}
