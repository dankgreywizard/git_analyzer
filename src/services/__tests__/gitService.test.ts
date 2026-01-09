import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService } from '../gitService';
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

  it('should list repos from arbitrary directory', async () => {
    (fs.promises.readdir as any).mockResolvedValue([
      { name: 'other-repo', isDirectory: () => true },
    ]);
    (git.resolveRef as any).mockResolvedValueOnce('oid');

    const repos = await gitService.listRepos('/any/path');
    expect(fs.promises.readdir).toHaveBeenCalledWith('/any/path', expect.anything());
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

  it('should open repo from any directory', async () => {
    (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
    (git.resolveRef as any).mockResolvedValue('oid');

    const result = await gitService.openRepo(undefined, '/outside');
    expect(result.dir).toBe('/outside');
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
        { path: 'file1.txt', status: 'modified' }
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
      expect(result.commits[0].files).toEqual([]);
    });

    it('should test listChangedFiles walk map logic', async () => {
      const walkMock = vi.fn().mockImplementation(async (options) => {
        const { map } = options;
        const results = [
          await map('.', [{}, {}]), // skip .
          await map('dir', [{ type: () => 'tree' }, { type: () => 'tree' }]), // skip trees
          await map('file1', [{ type: () => 'blob', oid: () => 'oid1' }, { type: () => 'blob', oid: () => 'oid1' }]), // skip same oid
          await map('file2', [{ type: () => 'blob', oid: () => 'oid1' }, { type: () => 'blob', oid: () => 'oid2' }]), // modified
          await map('file3', [null, { type: () => 'blob', oid: () => 'oid2' }]), // added
          await map('file4', [{ type: () => 'blob', oid: () => 'oid1' }, null]), // deleted
        ];
        return results.filter(Boolean);
      });
      (git as any).walk = walkMock;
      (git as any).TREE = vi.fn().mockReturnValue({});

      const result = await (gitService as any).listChangedFiles('test-repos/repo1', 'old', 'new');
      expect(result).toEqual([
        { path: 'file2', status: 'modified' },
        { path: 'file3', status: 'added' },
        { path: 'file4', status: 'deleted' },
      ]);
    });
  });

  describe('helpers', () => {
    it('should normalize paths', () => {
      expect((gitService as any).norm('a\\b\\c')).toBe('a/b/c');
      expect((gitService as any).norm('a///b/')).toBe('a/b');
    });

    it('should check if under repos', () => {
      expect((gitService as any).isUnderRepos('test-repos/a')).toBe(true);
      expect((gitService as any).isUnderRepos('test-repos')).toBe(true);
      // Still works as a helper, but no longer used for restriction
      expect((gitService as any).isUnderRepos('other/a')).toBe(false);
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
