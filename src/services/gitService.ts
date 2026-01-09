import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

export interface CloneOptions {
  depth?: number;
  singleBranch?: boolean;
  ref?: string;
}

export interface LogOptions {
  ref?: string;
  depth?: number;
}

/**
 * Service for interacting with Git repositories using isomorphic-git.
 */
export class GitService {
  private readonly reposBase: string;
  private readonly defaultDepth: number;

  /**
   * Initializes the Git service with optional configuration.
   * @param config Configuration options including reposBase and defaultDepth.
   */
  constructor(config?: { reposBase?: string; defaultDepth?: number }) {
    this.reposBase = this.norm(config?.reposBase ?? 'repos');
    this.defaultDepth = config?.defaultDepth ?? 25;
  }

  // Public API
  /**
   * Clones a repository from a given URL into a target directory.
   * @param url The repository URL to clone.
   * @param dir Optional target directory name.
   * @param options Optional clone settings (depth, singleBranch, ref).
   * @returns The directory where the repository was cloned.
   */
  async cloneRepo(url: string, dir?: string, options?: CloneOptions): Promise<{ dir: string }> {
    if (!url) throw new Error('Missing url');
    const targetDir = this.resolveTargetDir(url, dir);
    await this.ensureDir(targetDir);
    await git.clone({
      fs,
      http,
      dir: targetDir,
      url,
      singleBranch: options?.singleBranch ?? true,
      depth: options?.depth ?? this.defaultDepth,
      // If ref provided (e.g., branch), pass it along
      ...(options?.ref ? { ref: options.ref } : {}),
    } as any);
    return { dir: targetDir };
  }

  /**
   * Validates and returns the directory of an existing repository.
   * @param url Optional repository URL to resolve directory.
   * @param dir Optional directory path.
   * @returns The resolved repository directory.
   */
  async openRepo(url?: string, dir?: string): Promise<{ dir: string }> {
    if (!url && !dir) throw new Error('Missing url or dir');
    const targetDir = url ? this.resolveTargetDir(url, dir) : this.norm(dir!);
    
    // Check if directory exists
    try {
      const stats = await fs.promises.stat(targetDir);
      if (!stats.isDirectory()) {
        throw new Error(`${targetDir} is not a directory`);
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') throw new Error(`Directory ${targetDir} does not exist`);
      throw e;
    }

    // Check if it's a git repo by resolving HEAD
    try {
      await git.resolveRef({ fs, dir: targetDir, ref: 'HEAD' });
    } catch (e) {
      throw new Error(`${targetDir} is not a valid git repository`);
    }

    return { dir: targetDir };
  }

  /**
   * Lists all Git repositories in a given directory.
   * @param baseDir The directory to search in (defaults to this.reposBase).
   * @returns Array of repository directory names.
   */
  async listRepos(baseDir?: string): Promise<string[]> {
    const targetBase = baseDir ? this.norm(baseDir) : this.reposBase;
    try {
      const entries = await fs.promises.readdir(targetBase, { withFileTypes: true });
      const repos: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = `${targetBase}/${entry.name}`;
          try {
            // Check if it's a git repo by resolving HEAD
            await git.resolveRef({ fs, dir: dirPath, ref: 'HEAD' });
            repos.push(entry.name);
          } catch (e) {
            // Not a valid git repo, skip
          }
        }
      }
      return repos;
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  /**
   * Reads the commit log for a repository and includes changed files for each commit.
   * @param dir The repository directory.
   * @param options Optional log settings (ref, depth).
   * @returns Object containing the list of commits and an optional note.
   */
  async readLogWithFiles(dir: string, options?: LogOptions): Promise<{ commits: any[]; note?: string }>{
    const normDir = this.norm(dir);
    const ref = options?.ref ?? 'HEAD';
    const depth = options?.depth ?? this.defaultDepth;

    const resolved = await this.resolveRefSafe(normDir, ref);
    if (!resolved) {
      return { commits: [], note: `Ref ${ref} not found in ${normDir}` };
    }
    // Ensure the local shallow clone has enough history for the requested depth.
    // If the repo was cloned with a smaller depth, deepen it before reading the log.
    await this.deepenIfNeeded(normDir, ref, depth).catch(() => {});
    const baseCommits = await git.log({ fs, dir: normDir, ref: resolved, depth });
    const result: any[] = [];
    for (const c of baseCommits) {
      const oid = (c as any).oid;
      const parents: string[] = (c as any).commit?.parent || [];
      const parentOid = parents[0] || undefined;
      let files: any[] = [];
      try {
        files = parentOid ? await this.listChangedFiles(normDir, parentOid, oid) : await this.listChangedFiles(normDir, undefined, oid);
      } catch {
        files = [];
      }
      result.push({
        oid,
        commit: (c as any).commit,
        author: (c as any).author,
        committer: (c as any).committer,
        message: (c as any).commit?.message,
        files,
      });
    }
    return { commits: result };
  }

  /**
   * Compares two commit OIDs and lists the files that changed between them.
   * @param dir The repository directory.
   * @param oldOid The base commit OID.
   * @param newOid The target commit OID.
   * @returns Array of changed files with their status.
   */
  private async listChangedFiles(dir: string, oldOid: string | undefined, newOid: string): Promise<Array<{ path: string; status: 'added'|'modified'|'deleted' }>> {
    // Use isomorphic-git walk over two TREE snapshots
    const trees: any[] = [];
    const TREE: any = (git as any).TREE;
    if (oldOid) {
      trees.push(TREE({ ref: oldOid }));
    } else {
      trees.push(null);
    }
    trees.push(TREE({ ref: newOid }));
    const entries: any[] = await (git as any).walk({
      fs,
      dir,
      trees,
      map: async (filepath: string, [A, B]: any[]) => {
        if (filepath === '.') return;
        // Skip directories
        const typeA = A ? await A.type() : null;
        const typeB = B ? await B.type() : null;
        if (typeA === 'tree' || typeB === 'tree') return;
        const oidA = A ? await A.oid() : undefined;
        const oidB = B ? await B.oid() : undefined;
        if (oidA === oidB) return;
        let status: 'added'|'modified'|'deleted' = 'modified';
        if (A && !B) status = 'deleted';
        else if (!A && B) status = 'added';
        return { path: filepath, status };
      }
    });
    return entries.filter(Boolean);
  }

  // Helpers
  sanitizeRepoName(url: string): string {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      let name = parts.slice(-1)[0] || 'repo';
      if (name.endsWith('.git')) name = name.slice(0, -4);
      return (parts.slice(-2).join('-') || name).replace(/[^a-zA-Z0-9_-]/g, '-');
    } catch {
      return url.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) || 'repo';
    }
  }

  private resolveTargetDir(url: string, dir?: string): string {
    const base = this.reposBase;
    const chosen = dir && dir.trim().length > 0 ? this.norm(dir) : `${base}/${this.sanitizeRepoName(url)}`;
    return chosen;
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  private isUnderRepos(dir: string): boolean {
    const d = this.norm(dir);
    const b = this.reposBase.endsWith('/') ? this.reposBase : `${this.reposBase}/`;
    return d === this.reposBase || d.startsWith(b);
  }

  private norm(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
  }

  private async resolveRefSafe(dir: string, ref: string): Promise<string | null> {
    return git.resolveRef({ fs, dir, ref }).catch(() => null);
  }

  private async deepenIfNeeded(dir: string, ref: string, depth?: number): Promise<void> {
    if (!depth || depth <= 0) return;
    try {
      // Determine branch to fetch. If ref is HEAD or an OID, fall back to current branch.
      let branch = ref;
      if (!branch || branch === 'HEAD' || /[0-9a-f]{7,}/i.test(branch)) {
        const current = await (git as any).currentBranch({ fs, dir, fullname: false }).catch(() => null);
        if (current) branch = current;
      }
      await (git as any).fetch({
        fs,
        http,
        dir,
        remote: 'origin',
        // If branch is still unknown, omit ref to fetch the current branch
        ...(branch && branch !== 'HEAD' ? { ref: branch } : {}),
        singleBranch: true,
        depth,
        tags: false,
      });
    } catch {
      // Best-effort deepen; ignore failures (e.g., no network or detached HEAD)
    }
  }
}

export default GitService;
