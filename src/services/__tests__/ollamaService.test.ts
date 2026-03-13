import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ollamaResponse } from '../ollamaService';
import ollama from 'ollama';

vi.mock('ollama', () => {
  const mockChat = vi.fn();
  return {
    Ollama: vi.fn().mockImplementation(function() {
      return {
        chat: mockChat,
      };
    }),
    default: {
      chat: mockChat,
    },
  };
});

vi.mock('../configService', () => ({
  configService: {
    getConfig: vi.fn().mockResolvedValue({ defaultModel: 'test-model' }),
  }
}));

describe('ollamaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stream response from ollama', async () => {
    const req = {
      body: [JSON.stringify({ role: 'user', content: 'hello' })],
      on: vi.fn(),
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
      on: vi.fn(),
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

  it('should handle streaming errors gracefully', async () => {
    const req = {
      body: [JSON.stringify({ role: 'user', content: 'hello' })],
      on: vi.fn(),
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      headersSent: true,
    } as any;

    const mockErrorStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { message: { content: 'partial' } };
        throw new Error('Stream failed');
      }
    };

    (ollama.chat as any).mockResolvedValue(mockErrorStream);

    await ollamaResponse(req, resp);

    expect(resp.write).toHaveBeenCalledWith('partial');
    expect(resp.write).toHaveBeenCalledWith(expect.stringContaining('[Streaming error: Stream failed]'));
    expect(resp.end).toHaveBeenCalled();
  });

  it('should return 500 if error occurs before headers are sent', async () => {
    const req = {
      body: [JSON.stringify({ role: 'user', content: 'hello' })],
      on: vi.fn(),
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
    } as any;

    const mockErrorStream = {
      [Symbol.asyncIterator]: async function* () {
        throw new Error('Initial fail');
      }
    };

    (ollama.chat as any).mockResolvedValue(mockErrorStream);

    await ollamaResponse(req, resp);

    expect(resp.status).toHaveBeenCalledWith(500);
    expect(resp.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Initial fail') }));
  });
});