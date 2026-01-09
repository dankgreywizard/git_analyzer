import { createServer } from "http";
import express, {Express, Request, Response } from "express";
import { GitEntry } from "../types/git";
import { Message } from "../types/chat";
import { ollamaResponse } from "../services/ollamaService";
import { getAIService } from "../services/aiService";
import { configService } from "../services/configService";
import cors from "cors";
import httpProxy from "http-proxy";
import GitService from '../services/gitService';

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const webpackPort = process.env.WDS_PORT || '5100';

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
expressApp.post('/api/clone', async (req, res) => {
    const { url, dir } = req.body || {};
    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }
    try {
        const result = await gitService.cloneRepo(url, typeof dir === 'string' ? dir : undefined);
        res.json({ ok: true, dir: result.dir });
    } catch (e: any) {
        console.error('Clone failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Server-side open endpoint to verify and use an existing local repo
expressApp.post('/api/open', async (req, res) => {
    const { url, dir } = req.body || {};
    if (!url && !dir) {
        return res.status(400).json({ error: 'Missing url or dir' });
    }
    try {
        const result = await gitService.openRepo(
            typeof url === 'string' ? url : undefined,
            typeof dir === 'string' ? dir : undefined
        );
        res.json({ ok: true, dir: result.dir });
    } catch (e: any) {
        console.error('Open failed', e);
        res.status(400).json({ error: e?.message || String(e) });
    }
});

// Endpoint to list available local repositories
expressApp.get('/api/repos', async (req, res) => {
    try {
        const baseDir = typeof req.query.baseDir === 'string' ? req.query.baseDir : undefined;
        const repos = await gitService.listRepos(baseDir);
        res.json({ repos });
    } catch (e: any) {
        console.error('List repos failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Endpoint to read git log from a cloned repo
// Accepts either:
//   - url: a repository URL (preferred) → server maps to repos/<sanitized>
//   - dir: a local path OR mistakenly a URL (server will map URL → local)
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
        const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined;

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
            dirToUse = isUrl ? `repos/${gitService.sanitizeRepoName(raw)}` : raw;
        }

        if (!dirToUse) {
            return res.status(400).json({ error: 'Missing url or dir query parameter' });
        }

        // Enhanced: include changed files per commit
        const { commits, note } = await gitService.readLogWithFiles(dirToUse, { depth, ref });
        res.json({ commits, ...(note ? { note } : {}) });
    } catch (e: any) {
        console.error('Read log failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// List available AI models
expressApp.get('/api/ollama/models', async (_req, res) => {
    try {
        const aiService = getAIService();
        const models = await aiService.listModels();
        res.json({ models });
    } catch (e: any) {
        console.error('List models failed', e);
        res.status(500).json({ error: e?.message || String(e) });
    }
});

// Analyze commits via LLM (currently supports Ollama) and stream response as text/plain
expressApp.post('/api/analyze-commits', async (req: Request, res: Response) => {
    try {
        const { commits, model, maxCommits, instructions } = req.body || {};
        if (!Array.isArray(commits) || commits.length === 0) {
            return res.status(400).json({ error: 'Missing commits array' });
        }
        const config = configService.getConfig();
        const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : (config.defaultModel || 'codellama:latest');
        const cap = typeof maxCommits === 'number' && Number.isFinite(maxCommits) ? Math.min(Math.max(1, Math.floor(maxCommits)), 1000) : 100;

        // Compact commit entries to avoid huge payloads
        const compact = (commits as any[]).slice(0, cap).map((c, i) => ({
            index: i,
            oid: String((c.oid ?? c.commit?.oid ?? '')).slice(0, 12),
            author: c.author?.name || c.commit?.author?.name || 'Unknown',
            email: c.author?.email || c.commit?.author?.email || undefined,
            date: c.author?.timestamp ? new Date(c.author.timestamp * 1000).toISOString()
                : (c.commit?.author?.timestamp ? new Date(c.commit.author.timestamp * 1000).toISOString() : undefined),
            subject: String(c.message || c.commit?.message || '').split('\n')[0],
            message: String(c.message || c.commit?.message || '' ).slice(0, 4000),
            files: Array.isArray(c.files) ? c.files.slice(0, 200).map((f: any) => ({ path: String(f.path || ''), status: f.status })) : [],
        }));

        const systemPrompt = `You are a senior engineer assisting with Git history review. Analyze the following commits and provide:
1) A concise summary of key changes
2) Grouping by area/module if apparent
3) Potential risks/breaking changes
4) Suggested tests and verification steps
5) Notable contributors and hotspots.
Keep it structured with short sections and bullet points.`;

        const userPrompt = {
            task: 'Analyze the following commits',
            note: instructions || 'Focus on changes, risks, and tests. Use clear bullet points.',
            commits: compact,
        };

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        const aiService = getAIService();
        const stream = await aiService.chat({
            model: selectedModel,
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(userPrompt) },
            ],
        });

        for await (const part of stream) {
            const chunk = (part && (part as any).message && (part as any).message.content) ?? (part as any).response ?? '';
            if (chunk) res.write(chunk);
        }
        res.end();
    } catch (e: any) {
        console.error('Analyze commits failed', e);
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: e?.message || String(e) });
    }
});
// Get current AI configuration
expressApp.get('/api/config', (_req, res) => {
    res.json(configService.getConfig());
});

// Update AI configuration
expressApp.post('/api/config', (req, res) => {
    try {
        configService.updateConfig(req.body);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(500).json({ error: e?.message || String(e) });
    }
});

expressApp.use(express.static("static"));
//expressApp.use(express.static("dist/client"));
expressApp.use((req, resp) => proxy.web(req,resp));

const server = createServer(expressApp);
server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
server.listen(port,
    () => console.log(`HTTP Server listening on port ${port}`));


