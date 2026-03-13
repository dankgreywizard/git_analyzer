import { describe, it, expect, vi } from 'vitest';
import { ollamaResponse } from '../ollamaService';
import { getAIService } from '../aiService';

vi.mock('../aiService', () => ({
  getAIService: vi.fn(),
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

    const mockStream = (async function* () {
      yield { message: { content: 'Hi' } };
      yield { message: { content: ' there' } };
    })();

    vi.mocked(getAIService).mockReturnValue({
      chat: vi.fn().mockResolvedValue(mockStream),
      listModels: vi.fn(),
    } as any);

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

    const mockStream = (async function* () {
      yield { response: 'Chunk1' };
      yield { message: { content: 'Chunk2' } };
      yield null;
      yield {};
    })();

    vi.mocked(getAIService).mockReturnValue({
      chat: vi.fn().mockResolvedValue(mockStream),
      listModels: vi.fn(),
    } as any);

    await ollamaResponse(req, resp);

    expect(resp.write).toHaveBeenCalledWith('Chunk1');
    expect(resp.write).toHaveBeenCalledWith('Chunk2');
    expect(resp.end).toHaveBeenCalled();
  });
});