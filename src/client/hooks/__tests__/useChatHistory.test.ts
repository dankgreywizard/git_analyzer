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
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatHistory } from '../useChatHistory';
import { Chat } from '../../../types/chat';

describe('useChatHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty history if localStorage is empty', () => {
    const { result } = renderHook(() => useChatHistory());
    expect(result.current[0]).toEqual([]);
  });

  it('should load history from localStorage on mount', () => {
    const mockHistory: Chat[] = [
      { id: '1', messages: [{ role: 'user', content: 'hello' }] }
    ];
    localStorage.setItem('chatHistory', JSON.stringify(mockHistory));

    const { result } = renderHook(() => useChatHistory());
    expect(result.current[0]).toEqual(mockHistory);
  });

  it('should save history to localStorage when updated', () => {
    const { result } = renderHook(() => useChatHistory());
    const newChat: Chat = { id: '2', messages: [{ role: 'assistant', content: 'hi' }] };

    act(() => {
      const setHistory = result.current[1];
      setHistory([newChat]);
    });

    expect(result.current[0]).toEqual([newChat]);
    expect(localStorage.getItem('chatHistory')).toBe(JSON.stringify([newChat]));
  });

  it('should handle malformed JSON in localStorage gracefully', () => {
    localStorage.setItem('chatHistory', 'invalid-json');
    const { result } = renderHook(() => useChatHistory());
    expect(result.current[0]).toEqual([]);
  });

  it('should save or update chat using saveChat function', () => {
    const { result } = renderHook(() => useChatHistory());
    const chat1: Chat = { id: '1', messages: [{ role: 'user', content: 'hello' }] };
    const chat1Updated: Chat = { id: '1', messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }] };
    const chat2: Chat = { id: '2', messages: [{ role: 'user', content: 'new' }] };

    act(() => {
      result.current[2](chat1.id, chat1.messages);
    });
    expect(result.current[0]).toEqual([chat1]);

    act(() => {
      result.current[2](chat2.id, chat2.messages);
    });
    // chat2 should be prepended
    expect(result.current[0]).toEqual([chat2, chat1]);

    act(() => {
      result.current[2](chat1.id, chat1Updated.messages);
    });
    // chat1 should be updated in place
    expect(result.current[0]).toEqual([chat2, chat1Updated]);
  });
});
