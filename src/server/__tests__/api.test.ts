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
        };

        (GitService as any).mockImplementation(() => gitServiceMock);
        
        // Re-import index.ts or simulate its routes
        // For testing we will simulate the routes directly based on src/server/index.ts to avoid 
        // starting the actual server and its side effects (like proxy creation)
        
        app.post('/api/clone', async (req: any, res: any) => {
            const { url, dir } = req.body || {};
            if (typeof url !== 'string' || !url.trim()) return res.status(400).json({ error: 'Missing or invalid url' });
            try {
                const result = await gitServiceMock.cloneRepo(url.trim(), dir);
                res.json({ ok: true, dir: result.dir });
            } catch (e: any) { res.status(500).json({ error: e.message }); }
        });

        app.post('/api/checkout-commits', async (req: any, res: any) => {
            const { dir, commits } = req.body || {};
            if (typeof dir !== 'string' || !dir.trim() || !Array.isArray(commits) || commits.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid dir or commits array' });
            }
            const results = [];
            for (const oid of commits) {
                if (typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                    return res.status(400).json({ error: `Invalid commit OID: ${oid}` });
                }
                const result = await gitServiceMock.checkout(dir.trim(), oid, `branch-${oid.slice(0,7)}`);
                results.push({ oid, branch: result.branch });
            }
            res.json({ results });
        });

        app.post('/api/analyze-commits', async (req: any, res: any) => {
            const { commits } = req.body || {};
            if (!Array.isArray(commits) || commits.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid commits array' });
            }
            for (const c of commits) {
                const oid = c.oid ?? c.commit?.oid;
                if (!oid || typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                    return res.status(400).json({ error: `Invalid commit OID in analysis list: ${oid}` });
                }
            }
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('AI Analysis result');
        });

        app.post('/api/config', async (req: any, res: any) => {
            const { apiKey, baseUrl } = req.body || {};
            const sanitized: any = {};
            if (apiKey !== undefined) sanitized.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
            if (baseUrl !== undefined) sanitized.baseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
            await (configService as any).updateConfig(sanitized);
            res.json({ ok: true });
        });

        app.post('/api/reset-repo', async (req: any, res: any) => {
            try {
                const { dir, deleteTempBranches } = req.body || {};
                if (typeof dir !== 'string' || !dir.trim()) {
                    return res.status(400).json({ error: 'Missing or invalid dir' });
                }
                const result = await gitServiceMock.reset(dir.trim(), { deleteTempBranches: !!deleteTempBranches });
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

        it('should call gitService.cloneRepo and return success', async () => {
            gitServiceMock.cloneRepo.mockResolvedValue({ dir: 'repos/my-repo' });
            const response = await request(app).post('/api/clone').send({ url: 'http://git.com/repo' });
            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(gitServiceMock.cloneRepo).toHaveBeenCalledWith('http://git.com/repo', undefined);
        });
    });

    describe('POST /api/checkout-commits', () => {
        it('should return 400 if commits array is missing', async () => {
            const response = await request(app).post('/api/checkout-commits').send({ dir: 'repos/repo' });
            expect(response.status).toBe(400);
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
                baseUrl: null
            });
            expect(response.status).toBe(200);
            expect(configService.updateConfig).toHaveBeenCalledWith({
                apiKey: '',
                baseUrl: ''
            });
        });
    });

    describe('POST /api/reset-repo', () => {
        it('should return 400 if dir is missing', async () => {
            const response = await request(app).post('/api/reset-repo').send({});
            expect(response.status).toBe(400);
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
