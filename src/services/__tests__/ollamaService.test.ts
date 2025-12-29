import { describe, it, expect, vi } from 'vitest';
import { ollamaResponse } from '../ollamaService';
import ollama from 'ollama';

vi.mock('ollama', () => ({
  default: {
    chat: vi.fn(),
  },
}));

describe('ollamaService', () => {
  it('should stream response from ollama', async () => {
    const req = {
      body: [JSON.stringify({ role: 'user', content: 'hello' })],
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;

    const mockStream = [
      { message: { content: 'Hi' } },
      { message: { content: ' there' } },
    ];

    (ollama.chat as any).mockResolvedValue(mockStream);

    await ollamaResponse(req, resp);

    expect(resp.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(resp.write).toHaveBeenCalledWith('Hi');
    expect(resp.write).toHaveBeenCalledWith(' there');
    expect(resp.end).toHaveBeenCalled();
  });

  it('should handle different response part structures', async () => {
    const req = {
      body: [JSON.stringify({ role: 'user', content: 'hello' })],
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;

    const mockStream = [
      { response: 'Chunk1' },
      { message: { content: 'Chunk2' } },
      null,
      {},
    ];

    (ollama.chat as any).mockResolvedValue(mockStream);

    await ollamaResponse(req, resp);

    expect(resp.write).toHaveBeenCalledWith('Chunk1');
    expect(resp.write).toHaveBeenCalledWith('Chunk2');
    expect(resp.end).toHaveBeenCalled();
  });
});