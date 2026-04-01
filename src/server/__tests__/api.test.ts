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
import express from 'express';
import request from 'supertest';
import { configService } from '../../services/configService';
import GitService from '../../services/gitService';

// Mock core dependencies
vi.mock('../../services/gitService');
vi.mock('../../services/aiService');
vi.mock('../../services/configService');
vi.mock('../../services/ollamaService');

describe('API Endpoints - Integration and Security', () => {
    let app: any;
    let gitServiceMock: any;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());

        gitServiceMock = {
            cloneRepo: vi.fn(),
            openRepo: vi.fn(),
            listRepos: vi.fn(),
            checkout: vi.fn(),
            readLogWithFiles: vi.fn(),
            reset: vi.fn(),
            sanitizeRepoName: vi.fn().mockImplementation(url => url.replace(/[^a-z0-9]/gi, '-')),
            sanitizePath: vi.fn().mockImplementation(p => p),
            isPathUnderRepos: vi.fn().mockReturnValue(true),
        };

        (GitService as any).mockImplementation(() => gitServiceMock);
        
        // Re-import index.ts or simulate its routes
        // For testing we will simulate the routes directly based on src/server/index.ts to avoid 
        // starting the actual server and its side effects (like proxy creation)
        
        app.post('/api/clone', async (req: any, res: any) => {
            const { url, dir } = req.body || {};
            if (typeof url !== 'string' || !url.trim()) return res.status(400).json({ error: 'Missing or invalid url' });

            const trimmedUrl = url.trim();
            const sanitizedDir = typeof dir === 'string' && dir.trim() ? gitServiceMock.sanitizePath(dir.trim()) : undefined;
            if (sanitizedDir && !gitServiceMock.isPathUnderRepos(sanitizedDir)) {
                return res.status(400).json({ error: 'Invalid repository directory' });
            }

            try {
                const result = await gitServiceMock.cloneRepo(trimmedUrl, sanitizedDir);
                res.json({ ok: true, dir: result.dir });
            } catch (e: any) { res.status(500).json({ error: e.message }); }
        });

        app.post('/api/open', async (req: any, res: any) => {
            const { url, dir } = req.body || {};
            const trimmedUrl = typeof url === 'string' ? url.trim() : undefined;
            const trimmedDir = typeof dir === 'string' ? dir.trim() : undefined;
            if (!trimmedUrl && !trimmedDir) {
                return res.status(400).json({ error: 'Missing url or dir' });
            }
            const sanitizedDir = trimmedDir ? gitServiceMock.sanitizePath(trimmedDir) : undefined;
            if (sanitizedDir && !gitServiceMock.isPathUnderRepos(sanitizedDir)) {
                return res.status(400).json({ error: 'Invalid repository directory' });
            }
            try {
                const result = await gitServiceMock.openRepo(trimmedUrl, sanitizedDir);
                res.json({ ok: true, dir: result.dir });
            } catch (e: any) { res.status(500).json({ error: e.message }); }
        });

        app.get('/api/repos', async (req: any, res: any) => {
            const baseDir = typeof req.query.baseDir === 'string' ? req.query.baseDir.trim() : undefined;
            if (baseDir && baseDir !== '') {
                const sanitizedBase = gitServiceMock.sanitizePath(baseDir);
                if (!gitServiceMock.isPathUnderRepos(sanitizedBase)) {
                    return res.status(400).json({ error: 'Invalid baseDir' });
                }
            }
            try {
                const repos = await gitServiceMock.listRepos(baseDir || undefined);
                res.json({ repos });
            } catch (e: any) { res.status(500).json({ error: e.message }); }
        });

        app.get('/api/log', async (req: any, res: any) => {
            const ref = typeof req.query.ref === 'string' ? req.query.ref.trim() : undefined;
            if (ref && (/\s/.test(ref) || /[\x00-\x1F\x7F]/.test(ref))) {
                return res.status(400).json({ error: 'Invalid ref' });
            }
            const urlParam = typeof req.query.url === 'string' ? req.query.url : undefined;
            const dirParam = typeof req.query.dir === 'string' ? req.query.dir : '';
            let dirToUse = '';
            if (urlParam && urlParam.trim()) {
                dirToUse = `repos/${gitServiceMock.sanitizeRepoName(urlParam.trim())}`;
            } else if (dirParam && dirParam.trim()) {
                const raw = dirParam.trim();
                let isUrl = false;
                try { new URL(raw); isUrl = true; } catch {}
                dirToUse = isUrl ? `repos/${gitServiceMock.sanitizeRepoName(raw)}` : raw;
            }
            if (!dirToUse) return res.status(400).json({ error: 'Missing url or dir query parameter' });
            dirToUse = gitServiceMock.sanitizePath(dirToUse);
            if (!gitServiceMock.isPathUnderRepos(dirToUse)) {
                return res.status(400).json({ error: 'Invalid repository path' });
            }
            try {
                await gitServiceMock.openRepo(undefined, dirToUse);
                const { commits } = await gitServiceMock.readLogWithFiles(dirToUse, { ref });
                res.json({ commits });
            } catch (e: any) { res.status(400).json({ error: e.message }); }
        });

        app.post('/api/checkout-commits', async (req: any, res: any) => {
            const { dir, commits } = req.body || {};
            if (typeof dir !== 'string' || !dir.trim() || !Array.isArray(commits) || commits.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid dir or commits array' });
            }

            const sanitizedDir = gitServiceMock.sanitizePath(dir.trim());
            if (!gitServiceMock.isPathUnderRepos(sanitizedDir)) {
                return res.status(400).json({ error: 'Invalid repository directory' });
            }

            const results = [];
            for (const oid of commits) {
                if (typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                    return res.status(400).json({ error: `Invalid commit OID: ${oid}` });
                }
                const result = await gitServiceMock.checkout(sanitizedDir, oid, `branch-${oid.slice(0,7)}`);
                results.push({ oid, branch: result.branch });
            }
            res.json({ results });
        });

        app.post('/api/analyze-commits', async (req: any, res: any) => {
            const { commits, dir } = req.body || {};
            if (!Array.isArray(commits) || commits.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid commits array' });
            }
            for (const c of commits) {
                const oid = c.oid ?? c.commit?.oid;
                if (!oid || typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                    return res.status(400).json({ error: `Invalid commit OID in analysis list: ${oid}` });
                }
            }

            if (dir) {
                const normDir = gitServiceMock.sanitizePath(dir);
                if (!gitServiceMock.isPathUnderRepos(normDir)) {
                    return res.status(400).json({ error: 'Invalid repository directory' });
                }
            }

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('AI Analysis result');
        });

        app.get('/api/config', async (_req: any, res: any) => {
            const config = await (configService as any).getConfig();
            if (config.apiKey) {
                config.apiKey = '********';
            }
            res.json(config);
        });

        app.post('/api/config', async (req: any, res: any) => {
            const { apiKey, baseUrl, timeout, maxDiffLength } = req.body || {};
            const sanitized: any = {};
            if (apiKey !== undefined) {
                if (apiKey !== '********') {
                    sanitized.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
                }
            }
            if (baseUrl !== undefined) sanitized.baseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
            if (timeout !== undefined) {
                const val = typeof timeout === 'number' ? timeout : parseInt(String(timeout));
                sanitized.timeout = !isNaN(val) ? Math.min(Math.max(1000, val), 300000) : 30000;
            }
            if (maxDiffLength !== undefined) {
                const val = typeof maxDiffLength === 'number' ? maxDiffLength : parseInt(String(maxDiffLength));
                sanitized.maxDiffLength = !isNaN(val) ? Math.min(Math.max(10000, val), 100000) : 10000;
            }
            await (configService as any).updateConfig(sanitized);
            res.json({ ok: true });
        });

        app.post('/api/reset-repo', async (req: any, res: any) => {
            try {
                const { dir, deleteTempBranches } = req.body || {};
                if (typeof dir !== 'string' || !dir.trim()) {
                    return res.status(400).json({ error: 'Missing or invalid dir' });
                }

                const sanitizedDir = gitServiceMock.sanitizePath(dir.trim());
                if (!gitServiceMock.isPathUnderRepos(sanitizedDir)) {
                    return res.status(400).json({ error: 'Invalid repository directory' });
                }

                const result = await gitServiceMock.reset(sanitizedDir, { deleteTempBranches: !!deleteTempBranches });
                res.json(result);
            } catch (e: any) {
                res.status(500).json({ error: e.message });
            }
        });
    });

    describe('POST /api/clone', () => {
        it('should return 400 if url is missing', async () => {
            const response = await request(app).post('/api/clone').send({ dir: 'test' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('url');
        });

        it('should return 400 if url is empty', async () => {
            const response = await request(app).post('/api/clone').send({ url: '   ', dir: 'test' });
            expect(response.status).toBe(400);
        });

        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).post('/api/clone').send({ url: 'http://git.com/repo', dir: '/etc/passwd' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repository directory');
        });

        it('should call gitService.cloneRepo and return success', async () => {
            gitServiceMock.cloneRepo.mockResolvedValue({ dir: 'repos/my-repo' });
            const response = await request(app).post('/api/clone').send({ url: 'http://git.com/repo' });
            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(gitServiceMock.cloneRepo).toHaveBeenCalledWith('http://git.com/repo', undefined);
        });
    });

    describe('POST /api/open', () => {
        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).post('/api/open').send({ dir: '/etc/passwd' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repository directory');
        });

        it('should return 200 if dir is valid', async () => {
            gitServiceMock.openRepo.mockResolvedValue({ dir: 'repos/repo' });
            const response = await request(app).post('/api/open').send({ dir: 'repos/repo' });
            expect(response.status).toBe(200);
            expect(response.body.dir).toBe('repos/repo');
        });
    });

    describe('GET /api/repos', () => {
        it('should return 400 if baseDir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).get('/api/repos').query({ baseDir: '/etc' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid baseDir');
        });

        it('should return 200 if baseDir is valid', async () => {
            gitServiceMock.listRepos.mockResolvedValue(['repo1', 'repo2']);
            const response = await request(app).get('/api/repos').query({ baseDir: 'subfolder' });
            expect(response.status).toBe(200);
            expect(response.body.repos).toHaveLength(2);
        });
    });

    describe('GET /api/log', () => {
        it('should return 400 if ref is invalid', async () => {
            const response = await request(app).get('/api/log').query({ dir: 'repos/repo', ref: 'master; rm -rf' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid ref');
        });

        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).get('/api/log').query({ dir: '/etc/passwd' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid repository path');
        });

        it('should return 400 if openRepo fails', async () => {
            gitServiceMock.openRepo.mockRejectedValue(new Error('Not a git repo'));
            const response = await request(app).get('/api/log').query({ dir: 'repos/not-a-repo' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Not a git repo');
        });

        it('should return log if path is valid', async () => {
            gitServiceMock.openRepo.mockResolvedValue({ dir: 'repos/repo' });
            gitServiceMock.readLogWithFiles.mockResolvedValue({ commits: [{ oid: '123' }] });
            const response = await request(app).get('/api/log').query({ dir: 'repos/repo' });
            expect(response.status).toBe(200);
            expect(response.body.commits).toHaveLength(1);
        });
    });

    describe('POST /api/checkout-commits', () => {
        it('should return 400 if commits array is missing', async () => {
            const response = await request(app).post('/api/checkout-commits').send({ dir: 'repos/repo' });
            expect(response.status).toBe(400);
        });

        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).post('/api/checkout-commits').send({ dir: '/etc/passwd', commits: ['1234567'] });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repository directory');
        });

        it('should return 400 if commit OID is invalid', async () => {
            const response = await request(app).post('/api/checkout-commits').send({ 
                dir: 'repos/repo', 
                commits: ['abc', '; rm -rf /'] 
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid commit OID');
        });

        it('should checkout multiple valid commits', async () => {
            gitServiceMock.checkout.mockImplementation((_dir: string, _oid: string, branch: string) => ({ branch }));
            const commits = ['1234567890abcdef1234567890abcdef12345678', 'abcdef1234567890abcdef1234567890abcdef12'];
            const response = await request(app).post('/api/checkout-commits').send({ 
                dir: 'repos/repo', 
                commits 
            });
            expect(response.status).toBe(200);
            expect(response.body.results).toHaveLength(2);
            expect(gitServiceMock.checkout).toHaveBeenCalledTimes(2);
        });
    });

    describe('POST /api/analyze-commits', () => {
        it('should return 400 if commits are missing', async () => {
            const response = await request(app).post('/api/analyze-commits').send({});
            expect(response.status).toBe(400);
        });

        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).post('/api/analyze-commits').send({
                dir: '/etc/passwd',
                commits: [{ oid: '1234567890abcdef1234567890abcdef12345678' }]
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repository directory');
        });

        it('should validate OIDs within commit objects', async () => {
            const response = await request(app).post('/api/analyze-commits').send({
                commits: [{ oid: 'invalid-oid' }]
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid commit OID');
        });

        it('should support oid in commit sub-object (isomorphic-git style)', async () => {
            const response = await request(app).post('/api/analyze-commits').send({
                commits: [{ commit: { oid: '1234567890abcdef1234567890abcdef12345678' } }]
            });
            expect(response.status).toBe(200);
        });
    });

    describe('POST /api/config', () => {
        it('should mask API key on GET', async () => {
            (configService as any).getConfig.mockResolvedValue({
                apiKey: 'super-secret-key',
                baseUrl: 'http://api.com'
            });
            const response = await request(app).get('/api/config');
            expect(response.status).toBe(200);
            expect(response.body.apiKey).toBe('********');
        });

        it('should not update apiKey if masked value is sent', async () => {
            const response = await request(app).post('/api/config').send({
                apiKey: '********',
                baseUrl: 'http://new-api.com'
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith({
                baseUrl: 'http://new-api.com'
            });
        });

        it('should sanitize input and update config', async () => {
            const response = await request(app).post('/api/config').send({
                apiKey: '  secret-key  ',
                baseUrl: '  http://new-api.com  '
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith({
                apiKey: 'secret-key',
                baseUrl: 'http://new-api.com'
            });
        });

        it('should handle non-string inputs for config gracefully', async () => {
            const response = await request(app).post('/api/config').send({
                apiKey: 123,
                baseUrl: null,
                timeout: 'invalid'
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalled();
        });

        it('should clamp timeout value', async () => {
            const response = await request(app).post('/api/config').send({
                timeout: 1000000
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
                timeout: 300000
            }));
        });

        it('should clamp maxDiffLength value', async () => {
            const response = await request(app).post('/api/config').send({
                maxDiffLength: 200000
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
                maxDiffLength: 100000
            }));
        });

        it('should enforce minimum maxDiffLength value', async () => {
            const response = await request(app).post('/api/config').send({
                maxDiffLength: 5000
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
                maxDiffLength: 10000
            }));
        });
    });

    describe('POST /api/reset-repo', () => {
        it('should return 400 if dir is missing', async () => {
            const response = await request(app).post('/api/reset-repo').send({});
            expect(response.status).toBe(400);
        });

        it('should return 400 if dir is outside repos', async () => {
            gitServiceMock.isPathUnderRepos.mockReturnValue(false);
            const response = await request(app).post('/api/reset-repo').send({ dir: '/etc/passwd' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repository directory');
        });

        it('should call gitService.reset and return success', async () => {
            gitServiceMock.reset.mockResolvedValue({ branch: 'main' });
            const response = await request(app).post('/api/reset-repo').send({ dir: 'repos/repo' });
            expect(response.status).toBe(200);
            expect(response.body.branch).toBe('main');
            expect(gitServiceMock.reset).toHaveBeenCalledWith('repos/repo', { deleteTempBranches: false });
        });

        it('should handle deleteTempBranches option', async () => {
            gitServiceMock.reset.mockResolvedValue({ branch: 'master' });
            const response = await request(app).post('/api/reset-repo').send({ dir: 'repos/repo', deleteTempBranches: true });
            expect(response.status).toBe(200);
            expect(gitServiceMock.reset).toHaveBeenCalledWith('repos/repo', { deleteTempBranches: true });
        });
    });
});
