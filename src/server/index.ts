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
import { createServer } from "http";
import express, {Express, Request, Response } from "express";
import path from "path";
import { ollamaResponse, streamAIResponse } from "../services/ollamaService";
import { getAIService } from "../services/aiService";
import { configService } from "../services/configService";
import cors from "cors";
import httpProxy from "http-proxy";
import GitService from '../services/gitService';

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const webpackPort = process.env.WDS_PORT || '5101';

/**
 * Express application setup and API routes for the backend server.
 * Handles Git operations, LLM analysis, and static file serving.
 */
const expressApp: Express = express();
const proxy = httpProxy.createServer({
    target: `http://localhost:${webpackPort}`, ws: true
});
expressApp.use(cors({origin: `http://localhost:${webpackPort}`}));
// Increase JSON body size limit to handle larger chat and commit analysis payloads.
// Configurable via BODY_LIMIT env var (e.g., '2mb', '5mb').
expressApp.use(express.json({ limit: process.env.BODY_LIMIT || '5mb' }));

expressApp.post("/read", ollamaResponse);
// Instantiate GitService
const gitService = new GitService({ reposBase: 'repos', defaultDepth: 25 });

// Server-side clone endpoint to avoid browser FS and CORS
/**
 * POST /api/clone
 * Clones a Git repository from a URL.
 */
expressApp.post('/api/clone', async (req, res) => {
    const { url, dir } = req.body || {};
    if (typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: 'Missing or invalid url' });
    }
    const trimmedUrl = url.trim();
    const sanitizedDir = typeof dir === 'string' && dir.trim() ? gitService.sanitizePath(dir.trim()) : undefined;
    if (sanitizedDir && !gitService.isPathUnderRepos(sanitizedDir)) {
        return res.status(400).json({ error: 'Invalid repository directory' });
    }
    try {
        const result = await gitService.cloneRepo(trimmedUrl, sanitizedDir);
        res.json({ ok: true, dir: result.dir });
    } catch (e: any) {
        console.error('Clone failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Server-side open endpoint to verify and use an existing local repo
/**
 * POST /api/open
 * Verifies and opens an existing local Git repository.
 */
expressApp.post('/api/open', async (req, res) => {
    const { url, dir } = req.body || {};
    const trimmedUrl = typeof url === 'string' ? url.trim() : undefined;
    const trimmedDir = typeof dir === 'string' ? dir.trim() : undefined;
    if (!trimmedUrl && !trimmedDir) {
        return res.status(400).json({ error: 'Missing url or dir' });
    }
    const sanitizedDir = trimmedDir ? gitService.sanitizePath(trimmedDir) : undefined;
    if (sanitizedDir && !gitService.isPathUnderRepos(sanitizedDir)) {
        return res.status(400).json({ error: 'Invalid repository directory' });
    }
    try {
        const result = await gitService.openRepo(trimmedUrl, sanitizedDir);
        res.json({ ok: true, dir: result.dir });
    } catch (e: any) {
        console.error('Open failed', e);
        res.status(400).json({ error: e?.message || String(e) });
    }
});

// Endpoint to list available local repositories
/**
 * GET /api/repos
 * Lists available local Git repositories.
 */
expressApp.get('/api/repos', async (req, res) => {
    try {
        const baseDir = typeof req.query.baseDir === 'string' ? req.query.baseDir.trim() : undefined;
        // Validation for baseDir if provided
        if (baseDir && baseDir !== '') {
            const sanitizedBase = gitService.sanitizePath(baseDir);
            if (!gitService.isPathUnderRepos(sanitizedBase)) {
                return res.status(400).json({ error: 'Invalid baseDir' });
            }
        }
        const repos = await gitService.listRepos(baseDir || undefined);
        res.json({ repos });
    } catch (e: any) {
        console.error('List repos failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Endpoint to checkout one or more commits into individual branches.
// Body: { dir: string, commits: string[] }
/**
 * POST /api/checkout-commits
 * Checks out multiple commits into temporary branches for analysis.
 */
expressApp.post('/api/checkout-commits', async (req, res) => {
    try {
        const { dir, commits } = req.body || {};
        if (typeof dir !== 'string' || !dir.trim() || !Array.isArray(commits) || commits.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid dir or commits array' });
        }
        const sanitizedDir = gitService.sanitizePath(dir.trim());
        if (!gitService.isPathUnderRepos(sanitizedDir)) {
            return res.status(400).json({ error: 'Invalid repository directory' });
        }
        const results = [];
        for (const oid of commits) {
            if (typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                return res.status(400).json({ error: `Invalid commit OID: ${oid}` });
            }
            const branchName = `branch-${oid.slice(0, 7)}`;
            const result = await gitService.checkout(sanitizedDir, oid, branchName);
            results.push({ oid, branch: result.branch });
        }
        res.json({ results });
    } catch (e: any) {
        console.error('Checkout commits failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Endpoint to reset repository back to original state.
// Body: { dir: string, deleteTempBranches?: boolean }
/**
 * POST /api/reset-repo
 * Resets a repository to its original branch and cleans up temporary branches.
 */
expressApp.post('/api/reset-repo', async (req, res) => {
    try {
        const { dir, deleteTempBranches } = req.body || {};
        if (typeof dir !== 'string' || !dir.trim()) {
            return res.status(400).json({ error: 'Missing or invalid dir' });
        }
        const sanitizedDir = gitService.sanitizePath(dir.trim());
        if (!gitService.isPathUnderRepos(sanitizedDir)) {
            return res.status(400).json({ error: 'Invalid repository directory' });
        }
        const result = await gitService.reset(sanitizedDir, { deleteTempBranches: !!deleteTempBranches });
        res.json(result);
    } catch (e: any) {
        console.error('Reset repository failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Endpoint to read git log from a cloned repo
// Accepts either:
//   - url: a repository URL (preferred) → server maps to repos/<sanitized>
//   - dir: a local path OR mistakenly a URL (server will map URL → local)
/**
 * GET /api/log
 * Reads the Git commit log for a repository, including file changes and diffs.
 */
expressApp.get('/api/log', async (req, res) => {
    try {
        // Accept both `limit` and `depth`; clamp to [1, 1000]
        let depth = req.query.depth ? Number(req.query.depth) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        if (typeof limit === 'number' && !Number.isNaN(limit)) {
            depth = limit;
        }
        if (typeof depth === 'number') {
            if (Number.isNaN(depth)) depth = undefined;
            else {
                if (depth < 1) depth = 1;
                if (depth > 1000) depth = 1000;
            }
        }
        const ref = typeof req.query.ref === 'string' ? req.query.ref.trim() : undefined;
        // Basic ref sanitization (no spaces, no control chars)
        if (ref && (/\s/.test(ref) || /[\x00-\x1F\x7F]/.test(ref))) {
            return res.status(400).json({ error: 'Invalid ref' });
        }

        const urlParam = typeof req.query.url === 'string' ? req.query.url : undefined;
        const dirParam = typeof req.query.dir === 'string' ? req.query.dir : '';

        let dirToUse = '';
        if (urlParam && urlParam.trim()) {
            // Map URL → local repo dir
            dirToUse = `repos/${gitService.sanitizeRepoName(urlParam.trim())}`;
        } else if (dirParam && dirParam.trim()) {
            const raw = dirParam.trim();
            // If client passed a URL in `dir`, map it; otherwise use as-is
            let isUrl = false;
            try { new URL(raw); isUrl = true; } catch {}
            // Security: normalize and check if it's under repos if it's a local path
            dirToUse = isUrl ? `repos/${gitService.sanitizeRepoName(raw)}` : raw;
        }

        if (!dirToUse) {
            return res.status(400).json({ error: 'Missing url or dir query parameter' });
        }

        dirToUse = gitService.sanitizePath(dirToUse);
        if (!gitService.isPathUnderRepos(dirToUse)) {
            return res.status(400).json({ error: 'Invalid repository path' });
        }

        // Security check for log endpoint
        try {
            await gitService.openRepo(undefined, dirToUse);
        } catch (e: any) {
            return res.status(400).json({ error: `Invalid repository path: ${e.message}` });
        }

        // Enhanced: include changed files per commit
        const config = await configService.getConfig();
        const { commits, note } = await gitService.readLogWithFiles(dirToUse, { depth, ref, maxDiffLength: config.maxDiffLength });
        res.json({ commits, ...(note ? { note } : {}) });
    } catch (e: any) {
        console.error('Read log failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// List available AI models
/**
 * GET /api/ollama/models
 * Lists available AI models from the configured AI service.
 */
expressApp.get('/api/ollama/models', async (_req, res) => {
    try {
        const aiService = await getAIService();
        const models = await aiService.listModels();
        res.json({ models });
    } catch (e: any) {
        console.error('List models failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Analyze commits via LLM (currently supports Ollama) and stream response as text/plain
/**
 * POST /api/analyze-commits
 * Analyzes a list of Git commits using the configured AI service and streams the response.
 */
expressApp.post('/api/analyze-commits', async (req: Request, res: Response) => {
    console.log("Starting commit analysis request...");
    try {
        const { commits, model, maxCommits, instructions, dir } = req.body || {};
        console.log(`Analysis request: commits count=${Array.isArray(commits) ? commits.length : 'invalid'}, model=${model}`);
        if (!Array.isArray(commits) || commits.length === 0) {
            console.error("Invalid commits array in analysis request");
            return res.status(400).json({ error: 'Missing or invalid commits array' });
        }
        
        // Basic validation for commit objects
        for (const c of commits) {
            if (!c || typeof c !== 'object') {
                return res.status(400).json({ error: 'Invalid commit object in list' });
            }
            const oid = c.oid ?? c.commit?.oid;
            if (!oid || typeof oid !== 'string' || !/^[0-9a-f]{7,40}$/i.test(oid)) {
                return res.status(400).json({ error: `Invalid commit OID in analysis list: ${oid}` });
            }
        }

        if (typeof dir === 'string' && dir.trim()) {
            const normDir = gitService.sanitizePath(dir.trim());
            if (!gitService.isPathUnderRepos(normDir)) {
                return res.status(400).json({ error: 'Invalid repository directory' });
            }
        }

        const config = await configService.getConfig();
        const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : (config.defaultModel || 'codellama:latest');
        
        // Compact commit entries to avoid huge payloads.
        // We ensure all fields are stringified or appropriately typed for the LLM.
        const cap = typeof maxCommits === 'number' && Number.isFinite(maxCommits) ? Math.min(Math.max(1, Math.floor(maxCommits)), 1000) : 100;
        const compact = (commits as any[]).slice(0, cap).map((c, i) => {
            const oid = String(c.oid || (c.commit && c.commit.oid) || '').slice(0, 12);
            const author = c.author?.name || c.commit?.author?.name || 'Unknown';
            const email = c.author?.email || c.commit?.author?.email || undefined;
            const timestamp = c.author?.timestamp || c.commit?.author?.timestamp;
            const date = timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
            const rawMessage = String(c.message || (c.commit && c.commit.message) || '');
            const subject = rawMessage.split('\n')[0];
            const message = rawMessage.slice(0, 4000);
            
            const files = Array.isArray(c.files) ? c.files.slice(0, 500).map((f: any) => ({
                path: String(f.path || ''),
                status: f.status,
                diff: f.diff ? String(f.diff).slice(0, 8000) : undefined
            })) : [];

            return { index: i, oid, author, email, date, subject, message, files };
        });

        const systemPrompt = config.systemPrompt || `You are an expert code reviewer. Analyze the following commits and provide a comprehensive review:
1) Executive Summary: A concise overview of the changes across ALL selected commits.
2) Detailed File Analysis: For EACH and EVERY commit provided, explain the purpose of the changes in the individual files based on the provided diffs. Do not skip any commits.
3) Architectural Impact: How these changes affect the overall system, including any modifications to interfaces or public APIs.
4) Risk Assessment: Identify potential bugs, edge cases, breaking changes, or security concerns.
5) Testing Strategy: Specific, actionable suggestions for verifying the new or changed functionality.

Your tone should be professional and constructive. Use the provided diffs to give specific examples in your explanation. Ensure your review covers all commits listed in the user prompt.`;

        const userPrompt = {
            task: 'Review the following commits and explain the differences and impact of the changes.',
            note: typeof instructions === 'string' ? instructions.trim().slice(0, 2000) : 'Provide a detailed code review focusing on the differences between commits and individual file changes. Mention that these were checked out into individual branches for review.',
            commits: compact,
        };

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        const aiService = await getAIService();
        let stream;
        
        console.log(`Analyzing ${compact.length} commits with model: ${selectedModel} and timeout: ${config.timeout}ms`);
        try {
            stream = await aiService.chat({
                model: selectedModel,
                stream: true,
                timeout: config.timeout,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(userPrompt) },
                ],
            });
            console.log("AI analysis stream started");
        } catch (aiError: any) {
            console.error('AI Service failed to start analysis stream', aiError);
            if (!res.headersSent) {
                res.status(502).json({ error: `AI Provider error: ${aiError.message || String(aiError)}` });
            }
            return;
        }

        await streamAIResponse(req, res, stream);
    } catch (e: any) {
        console.error('Analyze commits failed', e);
        if (res.headersSent) {
            res.write(`\n[Analysis failed: ${e?.message || String(e)}]\n`);
            res.end();
        } else {
            res.status(500).json({ error: e?.message || String(e) });
        }
    }
});
// Get current AI configuration
/**
 * GET /api/config
 * Retrieves the current application configuration.
 */
expressApp.get('/api/config', async (_req, res) => {
    const config = await configService.getConfig();
    // Mask API key for security
    if (config.apiKey) {
        config.apiKey = '********';
    }
    res.json(config);
});

// Update AI configuration
/**
 * POST /api/config
 * Updates the application configuration.
 */
expressApp.post('/api/config', async (req, res) => {
    try {
        const { apiKey, baseUrl, defaultModel, availableModels, systemPrompt, persona, timeout, maxDiffLength } = req.body || {};
        
        // Basic type validation for settings
        const sanitized: any = {};
        if (apiKey !== undefined) {
            // Only update if it's not the masked value
            if (apiKey !== '********') {
                sanitized.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
            }
        }
        if (baseUrl !== undefined) sanitized.baseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
        if (defaultModel !== undefined) sanitized.defaultModel = typeof defaultModel === 'string' ? defaultModel.trim() : '';
        if (availableModels !== undefined) sanitized.availableModels = typeof availableModels === 'string' ? availableModels.trim() : '';
        if (systemPrompt !== undefined) sanitized.systemPrompt = typeof systemPrompt === 'string' ? systemPrompt.trim() : '';
        if (persona !== undefined) sanitized.persona = typeof persona === 'string' ? persona.trim() : '';
        if (timeout !== undefined) {
            const val = typeof timeout === 'number' ? timeout : parseInt(String(timeout));
            sanitized.timeout = !isNaN(val) ? Math.min(Math.max(1000, val), 300000) : 30000;
        }
        if (maxDiffLength !== undefined) {
            const val = typeof maxDiffLength === 'number' ? maxDiffLength : parseInt(String(maxDiffLength));
            sanitized.maxDiffLength = !isNaN(val) ? Math.min(Math.max(10000, val), 100000) : 10000;
        }

        await configService.updateConfig(sanitized);
        res.json({ ok: true });
    } catch (e: any) {
        console.error('Update config failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

expressApp.use(express.static("static"));
if (process.env.NODE_ENV === 'production') {
    expressApp.use(express.static("dist/client"));
    // Handle SPA routing
    expressApp.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/read')) {
            return next();
        }
        res.sendFile(path.resolve(__dirname, '../../dist/client/index.html'));
    });
} else {
    expressApp.use((req, resp) => proxy.web(req,resp));
}

const server = createServer(expressApp);
if (process.env.NODE_ENV !== 'production') {
    server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
}
server.listen(port,
    () => console.log(`HTTP Server listening on port ${port}`));


