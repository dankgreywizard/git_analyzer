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
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {GitService} from '../gitService';
import git from 'isomorphic-git';
import fs from 'fs';

vi.mock('isomorphic-git');
vi.mock('fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      stat: vi.fn(),
      readdir: vi.fn(),
    },
  },
}));

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    vi.clearAllMocks();
    gitService = new GitService({ reposBase: 'test-repos' });
  });

  it('should sanitize repo name correctly', () => {
    expect(gitService.sanitizeRepoName('https://github.com/user/repo.git')).toBe('user-repo-git');
    expect(gitService.sanitizeRepoName('https://github.com/user/repo')).toBe('user-repo');
    expect(gitService.sanitizeRepoName('invalid-url')).toBe('invalid-url');
  });

  it('should throw error if url is missing in cloneRepo', async () => {
    await expect(gitService.cloneRepo('')).rejects.toThrow('Missing url');
  });

  describe('sanitizePath', () => {
    it('should normalize paths correctly', () => {
      expect(gitService.sanitizePath('foo/bar/../baz')).toBe('foo/baz');
      expect(gitService.sanitizePath('foo//bar')).toBe('foo/bar');
      expect(gitService.sanitizePath('./foo')).toBe('foo');
    });

    it('should handle absolute paths (as they are normalized and leading slash removed)', () => {
      expect(gitService.sanitizePath('/abs/path')).toBe('abs/path');
    });
  });

  describe('isPathUnderRepos', () => {
    it('should return true for paths under repos base', () => {
      // With reposBase: 'test-repos'
      expect(gitService.isPathUnderRepos('test-repos/my-repo')).toBe(true);
    });

    it('should return false for paths outside repos base', () => {
      expect(gitService.isPathUnderRepos('../outside')).toBe(false);
      expect(gitService.isPathUnderRepos('/etc/passwd')).toBe(false);
    });

    it('should return false for paths that try to escape via .. even if they start with repos', () => {
      expect(gitService.isPathUnderRepos('test-repos/../../etc/passwd')).toBe(false);
    });
  });

  it('should call git.clone with correct parameters', async () => {
    const url = 'https://github.com/user/repo.git';
    await gitService.cloneRepo(url);
    expect(git.clone).toHaveBeenCalledWith(expect.objectContaining({
      url,
      dir: 'test-repos/user-repo-git',
    }));
  });

  it('should list repos correctly', async () => {
    (fs.promises.readdir as any).mockResolvedValue([
      { name: 'repo1', isDirectory: () => true },
      { name: 'not-a-repo', isDirectory: () => true },
      { name: 'file.txt', isDirectory: () => false },
    ]);
    (git.resolveRef as any)
      .mockResolvedValueOnce('oid1') // for repo1
      .mockRejectedValueOnce(new Error('not a repo')); // for not-a-repo

    const repos = await gitService.listRepos();
    expect(repos).toEqual(['repo1']);
  });

  it('should list repos from arbitrary directory (normalized)', async () => {
    (fs.promises.readdir as any).mockResolvedValue([
      { name: 'other-repo', isDirectory: () => true },
    ]);
    (git.resolveRef as any).mockResolvedValueOnce('oid');

    const repos = await gitService.listRepos('/any/path');
    expect(fs.promises.readdir).toHaveBeenCalledWith('any/path', expect.anything());
    expect(repos).toEqual(['other-repo']);
  });

  it('should handle ENOENT in listRepos', async () => {
    (fs.promises.readdir as any).mockRejectedValue({ code: 'ENOENT' });
    const repos = await gitService.listRepos();
    expect(repos).toEqual([]);
  });

  it('should throw other errors in listRepos', async () => {
    (fs.promises.readdir as any).mockRejectedValue(new Error('other error'));
    await expect(gitService.listRepos()).rejects.toThrow('other error');
  });

  it('should open repo correctly', async () => {
    (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
    (git.resolveRef as any).mockResolvedValue('oid');

    const result = await gitService.openRepo(undefined, 'test-repos/repo1');
    expect(result.dir).toBe('test-repos/repo1');
  });

  it('should throw error if outside repos base', async () => {
    await expect(gitService.openRepo(undefined, '/outside'))
      .rejects.toThrow('outside repos base');
  });

  describe('checkout', () => {
    it('should checkout a commit into a branch', async () => {
      const dir = 'test-repos/repo1';
      const oid = '1234567890abcdef';
      const branch = 'test-branch';

      (git.branch as any).mockResolvedValue(undefined);
      (git.checkout as any).mockResolvedValue(undefined);

      const result = await gitService.checkout(dir, oid, branch);

      expect(git.branch).toHaveBeenCalledWith(expect.objectContaining({
        dir: 'test-repos/repo1',
        ref: branch,
        object: oid,
      }));
      expect(git.checkout).toHaveBeenCalledWith(expect.objectContaining({
        dir: 'test-repos/repo1',
        ref: branch,
      }));
      expect(result.branch).toBe(branch);
    });

    it('should include diffs when listing changed files', async () => {
        const dir = 'test-repos/repo1';
        const oldOid = 'old';
        const newOid = 'new';
        
        const mockEntry = {
            type: () => 'blob',
            oid: () => 'blob-oid',
            content: () => Buffer.from('hello world')
        };
        
        (git.walk as any).mockImplementation(async ({ map }: any) => {
            return [await map('file.txt', [null, mockEntry])];
        });

        const files = await gitService.listChangedFiles(dir, oldOid, newOid);
        expect(files[0]).toMatchObject({
            path: 'file.txt',
            status: 'added',
            diff: expect.stringContaining('hello world')
        });
    });

    it('should handle AlreadyExistsError in branch creation', async () => {
      const dir = 'test-repos/repo1';
      const oid = '1234567890abcdef';
      const branch = 'test-branch';

      const error = new Error('Already exists');
      (error as any).code = 'AlreadyExistsError';

      (git.branch as any).mockRejectedValue(error);
      (git.checkout as any).mockResolvedValue(undefined);

      const result = await gitService.checkout(dir, oid, branch);

      expect(result.branch).toBe(branch);
      expect(git.checkout).toHaveBeenCalled();
    });

    it('should fail if outside repos base', async () => {
      await expect(gitService.checkout('/outside', 'oid')).rejects.toThrow('outside repos base');
    });
  });

  describe('readLogWithFiles', () => {
    it('should read log from any directory', async () => {
      (git.resolveRef as any).mockResolvedValue('oid-head');
      (git.log as any).mockResolvedValue([
        { oid: 'oid1', commit: { message: 'msg1', parent: ['oid0'] } },
      ]);
      (git as any).walk = vi.fn().mockResolvedValue([]);
      
      const result = await gitService.readLogWithFiles('/any/path');
      expect(result.commits).toHaveLength(1);
    });

    it('should return empty commits if ref not found', async () => {
      (git.resolveRef as any).mockRejectedValue(new Error('not found'));
      const result = await gitService.readLogWithFiles('test-repos/repo1', { ref: 'invalid' });
      expect(result.commits).toEqual([]);
      expect(result.note).toContain('Ref invalid not found');
    });

    it('should read log and list changed files', async () => {
      (git.resolveRef as any).mockResolvedValue('oid-head');
      (git.log as any).mockResolvedValue([
        { oid: 'oid1', commit: { message: 'msg1', parent: ['oid0'] } },
        { oid: 'oid2', commit: { message: 'msg2', parent: [] } },
      ]);
      (git as any).walk = vi.fn().mockResolvedValue([
        { path: 'file1.txt', status: 'modified', diff: 'some diff' }
      ]);
      (git as any).TREE = vi.fn().mockReturnValue({});

      const result = await gitService.readLogWithFiles('test-repos/repo1');
      expect(result.commits).toHaveLength(2);
      expect(result.commits[0].oid).toBe('oid1');
      expect(result.commits[0].files).toHaveLength(1);
      expect(result.commits[1].oid).toBe('oid2');
    });

    it('should handle errors in listChangedFiles', async () => {
      (git.resolveRef as any).mockResolvedValue('oid-head');
      (git.log as any).mockResolvedValue([
        { oid: 'oid1', commit: { message: 'msg1', parent: ['oid0'] } },
      ]);
      (git as any).walk = vi.fn().mockRejectedValue(new Error('walk failed'));

      const result = await gitService.readLogWithFiles('test-repos/repo1');
      expect(result.commits).toHaveLength(1);
      expect(result.commits[0].files).toHaveLength(1);
      expect(result.commits[0].files[0].path).toBe('error');
      expect(result.commits[0].files[0].diff).toContain('walk failed');
    });

    it('should handle per-file errors in listChangedFiles', async () => {
      const mockEntry = {
        type: () => 'blob',
        oid: () => 'blob-oid',
        content: () => { throw new Error('Git limit reached'); }
      };
      
      (git.walk as any).mockImplementation(async ({ map }: any) => {
        return [await map('large_file.txt', [null, mockEntry])];
      });

      const files = await gitService.listChangedFiles('test-repos/repo1', 'old', 'new');
      expect(files[0]).toMatchObject({
        path: 'large_file.txt',
        diff: expect.stringContaining('Git limit reached')
      });
    });

    it('should test listChangedFiles walk map logic', async () => {
      (git as any).walk = vi.fn().mockImplementation(async (options) => {
        const {map} = options;
        const results = [
          await map('.', [null, null]), // skip .
          await map('dir', [{type: async () => 'tree'}, {type: async () => 'tree'}]), // skip trees
          await map('file1', [{
            type: async () => 'blob',
            oid: async () => 'oid1',
            content: async () => Buffer.from('a')
          }, {type: async () => 'blob', oid: async () => 'oid1', content: async () => Buffer.from('a')}]), // skip same oid
          await map('file2', [{
            type: async () => 'blob',
            oid: async () => 'oid1',
            content: async () => Buffer.from('old')
          }, {type: async () => 'blob', oid: async () => 'oid2', content: async () => Buffer.from('new')}]), // modified
          await map('file3', [null, {
            type: async () => 'blob',
            oid: async () => 'oid2',
            content: async () => Buffer.from('added')
          }]), // added
          await map('file4', [{
            type: async () => 'blob',
            oid: async () => 'oid1',
            content: async () => Buffer.from('deleted')
          }, null]), // deleted
        ];
        return results.filter(Boolean);
      });
      (git as any).TREE = vi.fn().mockReturnValue({});

      const result = await (gitService as any).listChangedFiles('test-repos/repo1', 'old', 'new');
      expect(result).toHaveLength(3);
      expect(result[0].path).toBe('file2');
      expect(result[0].status).toBe('modified');
      expect(result[0].diff).toContain('new');
      expect(result[1].path).toBe('file3');
      expect(result[1].status).toBe('added');
      expect(result[2].path).toBe('file4');
      expect(result[2].status).toBe('deleted');
    });

    it('should truncate diff if maxDiffLength is exceeded', async () => {
      const longContent = 'A'.repeat(200);
      (git as any).walk = vi.fn().mockImplementation(async (options) => {
        const {map} = options;
        const result = await map('file', [null, {
          type: async () => 'blob',
          oid: async () => 'oid2',
          content: async () => Buffer.from(longContent)
        }]);
        return [result];
      });
      (git as any).TREE = vi.fn().mockReturnValue({});

      const maxDiffLength = 50;
      const result = await gitService.listChangedFiles('test-repos/repo1', undefined, 'new', maxDiffLength);
      expect(result[0].diff).toContain('[... truncated ...]');
      // The diff includes header text, so we check if the content part is truncated
      const contentPart = result[0].diff?.split('Content:\n')[1];
      expect(contentPart?.length).toBeLessThanOrEqual(maxDiffLength + '[... truncated ...]'.length + 1);
    });
  });

  describe('reset', () => {
    it('should reset repository to default branch', async () => {
      const dir = 'test-repos/repo1';
      (git.resolveRef as any).mockResolvedValueOnce('oid-main');
      (git.checkout as any).mockResolvedValue(undefined);

      const result = await gitService.reset(dir);

      expect(git.resolveRef).toHaveBeenCalledWith(expect.objectContaining({
        dir,
        ref: 'main',
      }));
      expect(git.checkout).toHaveBeenCalledWith(expect.objectContaining({
        dir,
        ref: 'main',
        force: true,
      }));
      expect(result.branch).toBe('main');
    });

    it('should try multiple candidates for default branch', async () => {
      const dir = 'test-repos/repo1';
      (git.resolveRef as any)
        .mockRejectedValueOnce(new Error('no main'))
        .mockResolvedValueOnce('oid-master');
      (git.checkout as any).mockResolvedValue(undefined);

      const result = await gitService.reset(dir);

      expect(git.resolveRef).toHaveBeenCalledTimes(2);
      expect(result.branch).toBe('master');
    });

    it('should delete temporary branches if requested', async () => {
      const dir = 'test-repos/repo1';
      (git.resolveRef as any).mockResolvedValue('oid');
      (git.checkout as any).mockResolvedValue(undefined);
      (git.listBranches as any).mockResolvedValue(['main', 'branch-1', 'other']);
      (git.deleteBranch as any).mockResolvedValue(undefined);

      await gitService.reset(dir, { deleteTempBranches: true });

      expect(git.listBranches).toHaveBeenCalled();
      expect(git.deleteBranch).toHaveBeenCalledWith(expect.objectContaining({
        ref: 'branch-1',
      }));
      expect(git.deleteBranch).not.toHaveBeenCalledWith(expect.objectContaining({
        ref: 'other',
      }));
    });

    it('should throw error if outside repos base', async () => {
      await expect(gitService.reset('/outside')).rejects.toThrow('outside repos base');
    });

    it('should default to main if no branch found', async () => {
        const dir = 'test-repos/repo1';
        (git.resolveRef as any).mockRejectedValue(new Error('no branch'));
        (git.checkout as any).mockResolvedValue(undefined);
  
        const result = await gitService.reset(dir);
  
        expect(result.branch).toBe('main');
        expect(git.checkout).toHaveBeenCalledWith(expect.objectContaining({
          ref: 'main',
        }));
      });
  
      it('should handle branch deletion failures', async () => {
        const dir = 'test-repos/repo1';
        (git.resolveRef as any).mockResolvedValue('oid');
        (git.checkout as any).mockResolvedValue(undefined);
        (git.listBranches as any).mockResolvedValue(['main', 'branch-1']);
        (git.deleteBranch as any).mockRejectedValue(new Error('delete failed'));
  
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await gitService.reset(dir, { deleteTempBranches: true });
  
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete branch branch-1'), expect.any(Error));
      });
  
      it('should handle reset exception', async () => {
        const dir = 'test-repos/repo1';
        (git.resolveRef as any).mockResolvedValue('oid');
        (git.checkout as any).mockRejectedValue(new Error('checkout failed'));
  
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(gitService.reset(dir)).rejects.toThrow('Reset failed');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Reset failed for'), expect.any(Error));
      });

      it('should handle no target branch provided and no candidates found', async () => {
        const dir = 'test-repos/repo1';
        (git.resolveRef as any).mockRejectedValue(new Error('no ref'));
        (git.checkout as any).mockResolvedValue(undefined);

        const result = await gitService.reset(dir);
        expect(result.branch).toBe('main'); // Falls back to main if no candidates found
      });
  });

  describe('helpers', () => {
    it('should normalize paths', () => {
      expect((gitService as any).norm('a\\b\\c')).toBe('a/b/c');
      expect((gitService as any).norm('a///b/')).toBe('a/b');
      expect(gitService.sanitizePath('a\\b\\c')).toBe('a/b/c');
    });

    it('should check if under repos', () => {
      expect((gitService as any).isUnderRepos('test-repos/a')).toBe(true);
      expect((gitService as any).isUnderRepos('test-repos')).toBe(true);
      expect((gitService as any).isUnderRepos('other/a')).toBe(false);
      expect(gitService.isPathUnderRepos('test-repos/a')).toBe(true);
      expect(gitService.isPathUnderRepos('other/a')).toBe(false);
    });

    it('should prevent path traversal in sanitizePath', () => {
      expect(gitService.sanitizePath('repo/../../etc/passwd')).toBe('etc/passwd');
      expect(gitService.sanitizePath('/etc/passwd')).toBe('etc/passwd');
      expect(gitService.sanitizePath('..')).toBe('');
    });
  });

  describe('deepenIfNeeded', () => {
    it('should call fetch when depth is provided', async () => {
      (git as any).currentBranch = vi.fn().mockResolvedValue('main');
      (git as any).fetch = vi.fn().mockResolvedValue({});
      
      await (gitService as any).deepenIfNeeded('test-repos/repo1', 'HEAD', 10);
      
      expect(git.fetch).toHaveBeenCalledWith(expect.objectContaining({
        dir: 'test-repos/repo1',
        depth: 10,
        ref: 'main'
      }));
    });

    it('should handle fetch failures gracefully', async () => {
      (git as any).fetch = vi.fn().mockRejectedValue(new Error('network error'));
      await expect((gitService as any).deepenIfNeeded('test-repos/repo1', 'HEAD', 10)).resolves.not.toThrow();
    });
  });
});
