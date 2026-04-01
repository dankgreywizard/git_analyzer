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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ollamaResponse } from '../ollamaService';
import { getAIService } from '../aiService';

vi.mock('../aiService', () => ({
  getAIService: vi.fn(),
}));

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

    const mockStream = (async function* () {
      yield { message: { content: 'Hi' } };
      yield { message: { content: ' there' } };
    })();

    vi.mocked(getAIService).mockResolvedValue({
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
      on: vi.fn(),
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

    vi.mocked(getAIService).mockResolvedValue({
      chat: vi.fn().mockResolvedValue(mockStream),
      listModels: vi.fn(),
    } as any);

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

    vi.mocked(getAIService).mockResolvedValue({
      chat: vi.fn().mockResolvedValue(mockErrorStream),
      listModels: vi.fn(),
    } as any);

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

    vi.mocked(getAIService).mockResolvedValue({
      chat: vi.fn().mockResolvedValue(mockErrorStream),
      listModels: vi.fn(),
    } as any);

    await ollamaResponse(req, resp);

    expect(resp.status).toHaveBeenCalledWith(500);
    expect(resp.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Initial fail') }));
  });

  it('should handle invalid request body (not an array)', async () => {
    const req = { body: 'not-an-array' } as any;
    const resp = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as any;

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(400);
    expect(resp.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid request body') }));
  });

  it('should handle invalid message type', async () => {
    const req = { body: [123] } as any;
    const resp = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as any;

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('should handle invalid JSON in string message', async () => {
    const req = { body: ['{invalid json}'] } as any;
    const resp = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as any;

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('should handle invalid message structure', async () => {
    const req = { body: [{ role: 'user' }] } as any; // missing content
    const resp = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as any;

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('should handle invalid role', async () => {
    const req = { body: [{ role: 'invalid', content: 'hi' }] } as any;
    const resp = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as any;

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(400);
  });

  it('should handle client disconnection', async () => {
    let closeCallback: any;
    const req = {
      body: [{ role: 'user', content: 'hello' }],
      on: vi.fn().mockImplementation((event, cb) => {
          if (event === 'close') closeCallback = cb;
      }),
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    } as any;

    const mockStream = (async function* () {
      yield { message: { content: 'Chunk1' } };
      closeCallback(); // Simulate client disconnection
      yield { message: { content: 'Chunk2' } };
    })();

    vi.mocked(getAIService).mockResolvedValue({
      chat: vi.fn().mockResolvedValue(mockStream),
      listModels: vi.fn(),
    } as any);

    await ollamaResponse(req, resp);

    expect(resp.write).toHaveBeenCalledWith('Chunk1');
    expect(resp.write).not.toHaveBeenCalledWith('Chunk2');
    expect(resp.end).not.toHaveBeenCalled(); // break loop, end not called in catch/finally if cancelled
  });

  it('should handle AI service exception', async () => {
    const req = {
      body: [{ role: 'user', content: 'hello' }],
      on: vi.fn(),
    } as any;
    const resp = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
    } as any;

    vi.mocked(getAIService).mockRejectedValue(new Error('AI Service Down'));

    await ollamaResponse(req, resp);
    expect(resp.status).toHaveBeenCalledWith(500);
    expect(resp.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('AI Service Down') }));
  });

  it('should handle AI service exception after headers sent', async () => {
    const req = {
      body: [{ role: 'user', content: 'hello' }],
      on: vi.fn(),
    } as any;
    const resp = {
      write: vi.fn(),
      end: vi.fn(),
      headersSent: true,
    } as any;

    vi.mocked(getAIService).mockRejectedValue(new Error('AI Service Down'));

    await ollamaResponse(req, resp);
    expect(resp.write).toHaveBeenCalledWith(expect.stringContaining('AI service error: AI Service Down'));
  });

  it('should not prepend system prompt if already present', async () => {
    const req = {
      body: [{ role: 'system', content: 'Existing system prompt' }, { role: 'user', content: 'hello' }],
      on: vi.fn(),
    } as any;
    const resp = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;

    const chatSpy = vi.fn().mockResolvedValue((async function* () { yield { response: 'Hi' }; })());
    vi.mocked(getAIService).mockResolvedValue({
      chat: chatSpy,
    } as any);

    await ollamaResponse(req, resp);

    expect(chatSpy).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        { role: 'system', content: 'Existing system prompt' },
        { role: 'user', content: 'hello' }
      ]
    }));
    // Should NOT have prepended the default system prompt from config
  });
});