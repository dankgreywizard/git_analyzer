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
 * @param props The component properties.
 * @returns The rendered Modal component.
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
