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
import GitService from '../gitService';
import git from 'isomorphic-git';
import fs from 'fs';

vi.mock('isomorphic-git');
vi.mock('isomorphic-git/http/node');
vi.mock('../configService', () => ({
  configService: {
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn()
  }
}));
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({})),
    writeFileSync: vi.fn(),
    promises: {
      mkdir: vi.fn(),
      stat: vi.fn(),
    },
  },
}));

describe('GitService Security and Validation', () => {
  let gitService: GitService;
  const reposBase = 'test-repos';

  beforeEach(() => {
    vi.clearAllMocks();
    gitService = new GitService({ reposBase });
  });

  describe('Path Traversal', () => {
    it('should prevent checkout outside of reposBase using ..', async () => {
      const maliciousDir = 'test-repos/../../etc/passwd';
      await expect(gitService.checkout(maliciousDir, 'some-oid'))
        .rejects.toThrow('outside repos base');
    });

    it('should prevent checkout to an absolute path outside of reposBase', async () => {
      const maliciousDir = '/etc/passwd';
      await expect(gitService.checkout(maliciousDir, 'some-oid'))
        .rejects.toThrow('outside repos base');
    });
    
    it('should prevent openRepo outside of reposBase', async () => {
        (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
        (git.resolveRef as any).mockResolvedValue('oid');
        
        await expect(gitService.openRepo(undefined, '/etc/passwd'))
            .rejects.toThrow('outside repos base');
    });
  });

  describe('OID Validation', () => {
    it('should handle malicious OIDs in checkout', async () => {
      // isomorphic-git might handle it, but we should see how it behaves
      (git.branch as any).mockRejectedValue(new Error('Invalid OID'));
      
      await expect(gitService.checkout('test-repos/repo1', '; rm -rf /'))
        .rejects.toThrow('Invalid OID');
    });
  });

  describe('Input Validation in sanitizeRepoName', () => {
      it('should handle unusual characters in URL', () => {
          const url = 'https://github.com/user/repo-with-$pecial-ch@rs.git';
          const sanitized = gitService.sanitizeRepoName(url);
          expect(sanitized).not.toContain('$');
          expect(sanitized).not.toContain('@');
          // Expecting it to handle the .git correctly or at least be consistent
          expect(sanitized).toBe('user-repo-with--pecial-ch-rs-git');
      });
  });

  describe('AI Service Input Validation', () => {
    // Mocking express objects for testing ollamaResponse
    it('should reject non-array body in ollamaResponse', async () => {
      const { ollamaResponse } = await import('../ollamaService.js');
      const req = { body: 'not-an-array' } as any;
      const res = { 
        status: vi.fn().mockReturnThis(), 
        json: vi.fn().mockReturnThis() 
      } as any;
      
      await ollamaResponse(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('expected array') }));
    });

    it('should reject malformed JSON in ollamaResponse array', async () => {
      const { ollamaResponse } = await import('../ollamaService.js');
      const req = { body: ['{invalid json}'] } as any;
      const res = { 
        status: vi.fn().mockReturnThis(), 
        json: vi.fn().mockReturnThis() 
      } as any;
      
      await ollamaResponse(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('parse') }));
    });

    it('should reject missing role or content in ollamaResponse', async () => {
      const { ollamaResponse } = await import('../ollamaService.js');
      const req = { body: [JSON.stringify({ role: 'user' })] } as any;
      const res = { 
        status: vi.fn().mockReturnThis(), 
        json: vi.fn().mockReturnThis() 
      } as any;
      
      await ollamaResponse(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('structure') }));
    });
  });
});
