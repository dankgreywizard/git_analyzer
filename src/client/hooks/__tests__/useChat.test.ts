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
import { useChat } from '../useChat';

describe('useChat', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.sending).toBe(false);
  });

  it('should add a message', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.addMessage('user', 'hello');
    });
    expect(result.current.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('should handle sendMessage with streaming', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello'));
        controller.enqueue(new TextEncoder().encode(' world!'));
        controller.close();
      },
    });

    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();
    const scrollToBottom = vi.fn();

    await act(async () => {
      await result.current.sendMessage('hi', undefined, onUpdateStatus, scrollToBottom);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Hello world!' },
    ]);
    expect(onUpdateStatus).toHaveBeenCalledWith('Ready', 'green');
    expect(scrollToBottom).toHaveBeenCalled();
  });

  it('should handle sendMessage errors', async () => {
    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    });

    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();

    await act(async () => {
      await result.current.sendMessage('hi', undefined, onUpdateStatus);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Error: Bad Request', isError: true },
    ]);
    expect(onUpdateStatus).toHaveBeenCalledWith('Error', 'red');
    expect(result.current.sending).toBe(false);
  });

  it('should handle handleCancel', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    
    // Mock fetch to stay pending
    (vi.mocked(fetch) as any).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useChat());
    
    act(() => {
      result.current.sendMessage('hi');
    });

    act(() => {
      result.current.handleCancel();
    });

    expect(abortSpy).toHaveBeenCalled();
  });

  it('should handle sendMessage fetch exception', async () => {
    (vi.mocked(fetch) as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();

    await act(async () => {
      await result.current.sendMessage('hi', undefined, onUpdateStatus);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Error: Network error', isError: true },
    ]);
  });

  it('should handle sendAnalysisRequest success', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Analysis complete'));
        controller.close();
      },
    });

    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();

    await act(async () => {
      await result.current.sendAnalysisRequest('Analyze this', { commits: [] }, onUpdateStatus);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Analyze this' },
      { role: 'assistant', content: 'Analysis complete' },
    ]);
    expect(onUpdateStatus).toHaveBeenCalledWith('Ready', 'green');
  });

  it('should handle sendAnalysisRequest failure', async () => {
    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();

    await act(async () => {
      await result.current.sendAnalysisRequest('Analyze this', { commits: [] }, onUpdateStatus);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Analyze this' },
      { role: 'assistant', content: 'Analysis Error: Internal Server Error', isError: true },
    ]);
  });

  it('should handle streaming with finalChunk', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Chunk'));
        controller.close();
      },
    });

    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      // Create a mock TextDecoder that doesn't use the real one to avoid recursion
      const decodeMock = vi.fn().mockImplementation((value) => {
          if (value === undefined) return "Final";
          // Just return something static or a simple decode if we can
          return "Chunk";
      });
      
      const originalDecode = TextDecoder.prototype.decode;
      // @ts-ignore
      TextDecoder.prototype.decode = decodeMock;

      await result.current.sendMessage('hi');
      
      TextDecoder.prototype.decode = originalDecode;
    });

    const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
    expect(assistantMessage?.content).toBe('ChunkFinal');
  });

  it('should handle cancelled request in handleError', async () => {
    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();
    
    // Mock fetch to reject with AbortError
    (vi.mocked(fetch) as any).mockImplementationOnce(() => {
      const controller = new AbortController();
      return new Promise((_, reject) => {
        // We trigger the actual abort via the hook
        setTimeout(() => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
        }, 10);
      });
    });

    await act(async () => {
      const promise = result.current.sendMessage('hi', undefined, onUpdateStatus);
      await new Promise(r => setTimeout(r, 5));
      result.current.handleCancel();
      await promise;
    });

    expect(onUpdateStatus).toHaveBeenCalledWith('Cancelled', 'yellow');
    // The empty assistant message should have been removed
    expect(result.current.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('should handle non-empty assistant message when cancelled', async () => {
    const { result } = renderHook(() => useChat());
    const onUpdateStatus = vi.fn();
    
    (vi.mocked(fetch) as any).mockImplementationOnce(async (url, options: any) => {
        // Wait for abort
        while(!options.signal.aborted) {
            await new Promise(r => setTimeout(r, 10));
        }
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
    });

    await act(async () => {
      const promise = result.current.sendMessage('hi', undefined, onUpdateStatus);
      
      // Manually set a non-empty assistant message to simulate partial stream
      result.current.setMessages([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Partial...' }]);
      
      result.current.handleCancel();
      await promise;
    });

    expect(onUpdateStatus).toHaveBeenCalledWith('Cancelled', 'yellow');
    // The non-empty assistant message should remain
    expect(result.current.messages).toEqual([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Partial...' }]);
  });

  it('should handle handleError without assistant message', async () => {
    const { result } = renderHook(() => useChat());
    
    // We can't easily trigger this via sendMessage because it adds one.
    // But we can trigger it via sendAnalysisRequest if we somehow make it fail before setting messages?
    // Actually, sendAnalysisRequest also sets it.
    
    // Let's use addMessage to set a state where there is NO assistant message, then trigger an error.
    // Since handleError is not exported, we have to trigger it via sendMessage.
    
    (vi.mocked(fetch) as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Error',
    });

    await act(async () => {
      const promise = result.current.sendMessage('hi');
      // Remove the assistant message manually before it fails
      result.current.setMessages([{ role: 'user', content: 'hi' }]);
      await promise;
    });

    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'Error: Error', isError: true });
  });

  it('should handle sendAnalysisRequest exception in handleError', async () => {
    (vi.mocked(fetch) as any).mockRejectedValueOnce(new Error('Analysis failed'));

    const { result } = renderHook(() => useChat());
    
    await act(async () => {
      await result.current.sendAnalysisRequest('Analyze', { commits: [] });
    });

    expect(result.current.messages[1]).toEqual({ 
        role: 'assistant', 
        content: 'Analysis Error: Analysis failed', 
        isError: true 
    });
  });
});
