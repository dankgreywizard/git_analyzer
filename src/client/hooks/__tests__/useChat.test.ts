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
});
