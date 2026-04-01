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
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

/**
 * Options for cloning a repository.
 */
export interface CloneOptions {
  depth?: number;
  singleBranch?: boolean;
  ref?: string;
}

/**
 * Options for reading the commit log.
 */
export interface LogOptions {
  ref?: string;
  depth?: number;
  maxDiffLength?: number;
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
    this.reposBase = this.sanitizePath(config?.reposBase ?? 'repos');
    this.defaultDepth = config?.defaultDepth ?? 25;
  }

  /**
   * Public helper to sanitize a path.
   */
  public sanitizePath(p: string): string {
    return this.norm(p);
  }

  /**
   * Public helper to check if a path is within the repos base.
   */
  public isPathUnderRepos(dir: string): boolean {
    return this.isUnderRepos(dir);
  }

  private validatePath(dir: string): string {
    const targetDir = this.norm(dir);
    if (!this.isUnderRepos(targetDir)) {
      throw new Error(`${targetDir} is outside repos base`);
    }
    return targetDir;
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
    this.validatePath(targetDir);
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
    this.validatePath(targetDir);
    
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
   * Checks out a specific commit into a new or existing branch.
   * @param dir The repository directory.
   * @param ref The commit OID or reference to check out.
   * @param branch Optional branch name to create/checkout.
   * @param force Optional force flag.
   * @returns A promise that resolves to an object containing the current branch.
   */
  async checkout(dir: string, ref: string, branch?: string, force = false): Promise<{ branch: string }> {
    const targetDir = this.validatePath(dir);
    const checkoutBranch = branch || `branch-${ref.slice(0, 7)}`;

    try {
      // Create branch if it doesn't exist
      try {
        await git.branch({ fs, dir: targetDir, ref: checkoutBranch, object: ref });
      } catch (e: any) {
        if (e.code !== 'AlreadyExistsError') {
          throw e;
        }
      }

      // Check out the branch
      await git.checkout({
        fs,
        dir: targetDir,
        ref: checkoutBranch,
        force,
      });

      return { branch: checkoutBranch };
    } catch (e: any) {
      console.error(`Checkout failed for ${ref}`, e);
      throw new Error(`Checkout failed for ${ref}: ${e.message}`);
    }
  }

  /**
   * Lists all Git repositories in a given directory.
   * @param baseDir The directory to search in (defaults to this.reposBase).
   * @returns A promise that resolves to an array of repository directory names.
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
   * @param options Optional log settings (ref, depth, maxDiffLength).
   * @returns A promise that resolves to an object containing the list of commits and an optional note.
   */
  async readLogWithFiles(dir: string, options?: LogOptions): Promise<{ commits: any[]; note?: string }>{
    const normDir = this.norm(dir);
    const ref = options?.ref ?? 'HEAD';
    const depth = options?.depth ?? this.defaultDepth;
    const maxDiffLength = options?.maxDiffLength ?? 10000;

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
        files = parentOid ? await this.listChangedFiles(normDir, parentOid, oid, maxDiffLength) : await this.listChangedFiles(normDir, undefined, oid, maxDiffLength);
      } catch (e: any) {
        // If the entire listing fails, we provide a descriptive error message as a dummy file entry
        // This ensures the user knows why file data is missing for this commit.
        files = [{ 
          path: 'error', 
          status: 'modified', 
          diff: `Failed to list changed files for this commit: ${e?.message || String(e)}` 
        }];
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
   * Generates a simple unified diff between two text contents.
   * @param filepath The path of the file being diffed.
   * @param status The modification status (added, deleted, modified).
   * @param textA The original file content.
   * @param textB The new file content.
   * @param maxDiffLength The maximum length of the generated diff.
   * @returns The generated diff string.
   */
  private generateSimpleDiff(filepath: string, status: 'added' | 'deleted' | 'modified', textA: string, textB: string, maxDiffLength = 10000): string {
    let diff = '';
    const MAX_CONTENT_LENGTH = maxDiffLength;
    const MAX_LINES = 10000;

    if (status === 'added') {
      return `File: ${filepath} (added)\nContent:\n${textB.slice(0, MAX_CONTENT_LENGTH)}${textB.length > MAX_CONTENT_LENGTH ? '\n[... truncated ...]' : ''}`;
    } else if (status === 'deleted') {
      return `File: ${filepath} (deleted)\nFormer Content:\n${textA.slice(0, MAX_CONTENT_LENGTH)}${textA.length > MAX_CONTENT_LENGTH ? '\n[... truncated ...]' : ''}`;
    }

    // modified - use a very basic line-by-line comparison for the AI
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');

    if (linesA.length >= MAX_LINES || linesB.length >= MAX_LINES) {
      diff = `File: ${filepath} (modified)\n[Content too large for detailed diff, providing new content summary]\n`;
      return diff + textB.slice(0, 20000) + (textB.length > 20000 ? '\n...' : '');
    }

    diff = `File: ${filepath} (modified)\n--- old\n+++ new\n`;
    let i = 0, j = 0;
    while (i < linesA.length || j < linesB.length) {
      if (i < linesA.length && j < linesB.length && linesA[i] === linesB[j]) {
        diff += `  ${linesA[i]}\n`;
        i++;
        j++;
      } else {
        let lookAhead = 1;
        let foundMatch = false;
        while (lookAhead < 10 && (i + lookAhead < linesA.length || j + lookAhead < linesB.length)) {
          if (i + lookAhead < linesA.length && linesA[i + lookAhead] === linesB[j]) {
            for (let k = 0; k < lookAhead; k++) diff += `-${linesA[i + k]}\n`;
            i += lookAhead;
            foundMatch = true;
            break;
          }
          if (j + lookAhead < linesB.length && linesA[i] === linesB[j + lookAhead]) {
            for (let k = 0; k < lookAhead; k++) diff += `+${linesB[j + k]}\n`;
            j += lookAhead;
            foundMatch = true;
            break;
          }
          lookAhead++;
        }
        if (!foundMatch) {
          if (i < linesA.length) {
            diff += `-${linesA[i]}\n`;
            i++;
          }
          if (j < linesB.length) {
            diff += `+${linesB[j]}\n`;
            j++;
          }
        }
      }
      if (diff.length > MAX_CONTENT_LENGTH) {
        diff += `\n[... diff truncated due to size ...]`;
        break;
      }
    }
    return diff;
  }

  /**
   * Compares two commit OIDs and lists the files that changed between them,
   * optionally including the content diff.
   * @param dir The repository directory.
   * @param oldOid The base commit OID.
   * @param newOid The target commit OID.
   * @param maxDiffLength Optional character limit for diff generation.
   * @returns Array of changed files with their status and optional diff.
   */
  async listChangedFiles(dir: string, oldOid: string | undefined, newOid: string, maxDiffLength = 10000): Promise<Array<{ path: string; status: 'added' | 'modified' | 'deleted'; diff?: string }>> {
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
        let status: 'added' | 'modified' | 'deleted' = 'modified';
        if (A && !B) status = 'deleted';
        else if (!A && B) status = 'added';

        let diff = '';
        try {
          const contentA = A ? await A.content() : Buffer.alloc(0);
          const contentB = B ? await B.content() : Buffer.alloc(0);
          const textA = new TextDecoder().decode(contentA);
          const textB = new TextDecoder().decode(contentB);
          diff = this.generateSimpleDiff(filepath, status, textA, textB, maxDiffLength);
        } catch (e: any) {
          // Identify potential git limits or data-related issues
          const msg = e?.message || String(e);
          if (msg.includes('too large') || msg.includes('limit')) {
            diff = `File: ${filepath} skipped: Git limit reached or file too large for analysis.`;
          } else if (msg.includes('binary')) {
            diff = `File: ${filepath} skipped: Binary files are not supported for AI analysis.`;
          } else {
            diff = `File: ${filepath} skipped: Error generating diff (${msg})`;
          }
        }

        return { path: filepath, status, diff };
      }
    });
    return entries.filter(Boolean);
  }

  /**
   * Resets a repository to its default branch (e.g., main or master) and optionally deletes temporary branches.
   * @param dir The repository directory.
   * @param options Optional reset settings (targetBranch, deleteTempBranches).
   * @returns A promise that resolves to an object containing the target branch after reset.
   */
  async reset(dir: string, options?: { targetBranch?: string; deleteTempBranches?: boolean }): Promise<{ branch: string }> {
    const targetDir = this.validatePath(dir);
    let targetBranch = options?.targetBranch;

    // If target branch is not provided, try to find the default branch (main, master, or via remotes)
    if (!targetBranch) {
      const candidates = ['main', 'master', 'origin/main', 'origin/master'];
      for (const candidate of candidates) {
        try {
          await git.resolveRef({ fs, dir: targetDir, ref: candidate });
          targetBranch = candidate;
          break;
        } catch {}
      }
    }

    // Default to 'main' if none found
    if (!targetBranch) {
      targetBranch = 'main';
    }

    try {
      // Check out the target branch
      await git.checkout({
        fs,
        dir: targetDir,
        ref: targetBranch,
        force: true, // Always force reset for this operation
      });

      // Optionally delete all temporary branches (branch-*)
      if (options?.deleteTempBranches) {
        const branches = await git.listBranches({ fs, dir: targetDir });
        const tempBranches = branches.filter((b) => b.startsWith('branch-'));
        for (const b of tempBranches) {
          try {
            await git.deleteBranch({ fs, dir: targetDir, ref: b });
          } catch (e) {
            console.error(`Failed to delete branch ${b}`, e);
          }
        }
      }

      return { branch: targetBranch };
    } catch (e: any) {
      console.error(`Reset failed for ${targetDir}`, e);
      throw new Error(`Reset failed for ${targetDir}: ${e.message}`);
    }
  }

  // Helpers
  /**
   * Sanitizes a repository name from a given URL.
   * @param url The repository URL.
   * @returns A sanitized name suitable for a directory.
   */
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

  /**
   * Resolves the target directory for a repository URL and optional directory name.
   * @param url The repository URL.
   * @param dir Optional target directory name.
   * @returns The resolved target directory path.
   */
  private resolveTargetDir(url: string, dir?: string): string {
    const base = this.reposBase;
    return dir && dir.trim().length > 0 ? this.norm(dir) : `${base}/${this.sanitizeRepoName(url)}`;
  }

  /**
   * Ensures that a directory exists, creating it if necessary.
   * @param dir The directory path.
   */
  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  /**
   * Checks if a directory is within the configured repos base.
   * @param dir The directory path.
   * @returns True if the directory is under the repos base, false otherwise.
   */
  private isUnderRepos(dir: string): boolean {
    const d = this.norm(dir);
    const b = this.reposBase.endsWith('/') ? this.reposBase : `${this.reposBase}/`;
    return d === this.reposBase || d.startsWith(b);
  }

  /**
   * Normalizes a path by fixing slashes and resolving relative segments.
   * @param p The path to normalize.
   * @returns The normalized path.
   */
  private norm(p: string): string {
    // Basic normalization: replace backslashes and remove duplicate slashes
    let normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    
    // To handle '..', we split by '/' and resolve
    const parts = normalized.split('/');
    const result: string[] = [];
    for (const part of parts) {
        if (part === '..') {
            result.pop();
        } else if (part !== '.' && part !== '') {
            result.push(part);
        }
    }
    // Reconstruct, always ensuring we return a relative path for security
    return result.join('/') || '';
  }

  /**
   * Safely resolves a git reference (e.g., branch, tag, or OID).
   * @param dir The repository directory.
   * @param ref The reference to resolve.
   * @returns The resolved OID, or null if it cannot be resolved.
   */
  private async resolveRefSafe(dir: string, ref: string): Promise<string | null> {
    return git.resolveRef({ fs, dir, ref }).catch(() => null);
  }

  /**
   * Deepens a shallow clone if necessary to ensure it has enough history.
   * @param dir The repository directory.
   * @param ref The reference to fetch.
   * @param depth The desired history depth.
   */
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
