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
import React, { useCallback, useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

interface GitOperationsProps {
  onResult?: (result: any) => void;
  updateStatus?: (msg: string, color?: "gray" | "yellow" | "green" | "red") => void;
  onLogData?: (data: any) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}

/**
 * Component to handle Git operations like cloning, opening repositories, and fetching logs.
 * @param props The component properties.
 * @returns The rendered GitOperations component.
 */
export default function GitOperations({ 
  onResult, 
  updateStatus, 
  onLogData, 
  onBusyChange, 
  disabled = false 
}: GitOperationsProps) {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(25); // number of commits to fetch (1..1000)
  const [busy, setBusy] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [localRepos, setLocalRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [baseDir, setBaseDir] = useState("repos");

  /**
   * Fetches the list of local repositories from the server.
   */
  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const response = await fetch(`/api/repos?baseDir=${encodeURIComponent(baseDir)}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.repos)) {
        setLocalRepos(data.repos);
      }
    } catch (error) {
      console.error("Failed to fetch repos", error);
    } finally {
      setLoadingRepos(false);
    }
  }, [baseDir]);

  /**
   * Handles selecting a repository from the list of local repositories.
   * @param repoName The name of the repository.
   */
  const handleSelectRepo = (repoName: string) => {
    const prefix = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
    setUrl(`${prefix}${repoName}`);
    setShowSelectModal(false);
  };

  /**
   * Pushes the result of a Git operation to the parent component.
   * @param entry The result entry.
   */
  const pushResult = useCallback((entry: any) => {
    onResult?.({ id: String(Date.now()) + Math.random().toString(36).slice(2), time: Date.now(), ...entry });
  }, [onResult]);

  /**
   * Handles cloning a Git repository.
   */
  const handleClone = useCallback(async () => {
    const repoUrl = url.trim();
    if (!repoUrl) {
      updateStatus?.("Enter a repository URL", "yellow");
      return;
    }
    if (disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    updateStatus?.("Cloning...", "yellow");
    try {
      const response = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Clone failed");
      pushResult({ op: "clone", status: "success", request: { url: repoUrl }, data });
      updateStatus?.("Clone successful. Fetching log...", "green");

      // Automatically trigger log after cloning
      await handleLog(true);
      updateStatus?.("Log fetched successfully", "green");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      pushResult({ op: "clone", status: "error", request: { url: repoUrl }, error: errorMsg });
      updateStatus?.(`Clone failed: ${errorMsg}`, "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, pushResult, updateStatus, disabled, onBusyChange]);

  /**
   * Handles opening a Git repository.
   */
  const handleOpen = useCallback(async () => {
    const repoUrl = url.trim();
    if (!repoUrl) {
      updateStatus?.("Enter a repository URL or local path", "yellow");
      return;
    }
    if (disabled) return;
    setBusy(true);
    onBusyChange?.(true);
      updateStatus?.("Opening repository...", "yellow");
      try {
        // Determine if it's a URL or a path
        let isUrl = false;
        try { new URL(repoUrl); isUrl = true; } catch {}

        const response = await fetch("/api/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isUrl ? { url: repoUrl } : { dir: repoUrl }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Open failed");
        pushResult({ op: "open", status: "success", request: { url: isUrl ? repoUrl : undefined, dir: !isUrl ? repoUrl : undefined }, data });
        updateStatus?.("Repository opened successfully. Fetching log...", "green");

        // Automatically trigger log after opening
        await handleLog(true);
        updateStatus?.("Log fetched successfully", "green");
      } catch (error: any) {
      const errorMsg = error?.message || String(error);
      pushResult({ op: "open", status: "error", request: { url: repoUrl }, error: errorMsg });
      updateStatus?.(`Open failed: ${errorMsg}`, "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, pushResult, updateStatus, disabled, onBusyChange]);

  /**
   * Fetches the Git log for the current repository.
   * @param ignoreDisabled Whether to ignore the disabled state.
   */
  const handleLog = useCallback(async (ignoreDisabled = false) => {
    const repoUrl = url.trim();
    if (!repoUrl) {
      updateStatus?.("Enter a repository URL", "yellow");
      return;
    }
    if (!ignoreDisabled && disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    updateStatus?.("Reading log...", "yellow");
    try {
      // Determine if it's a URL or a path
      let isUrl = false;
      try { new URL(repoUrl); isUrl = true; } catch {}

      // clamp limit to [1, 1000]
      let reqLimit = Number(limit);
      if (!Number.isFinite(reqLimit)) reqLimit = 25;
      if (reqLimit < 1) reqLimit = 1;
      if (reqLimit > 1000) reqLimit = 1000;

      const queryParam = isUrl ? `url=${encodeURIComponent(repoUrl)}` : `dir=${encodeURIComponent(repoUrl)}`;
      const response = await fetch(`/api/log?${queryParam}&limit=${reqLimit}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Log failed");
      pushResult({ op: "log", status: "success", request: { url: repoUrl, limit: reqLimit }, data });
      onLogData?.(data);
      updateStatus?.("Ready", "green");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      pushResult({ op: "log", status: "error", request: { url: repoUrl, limit }, error: errorMsg });
      updateStatus?.(`Log failed: ${errorMsg}`, "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, limit, pushResult, updateStatus, disabled, onBusyChange, onLogData]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">URL or Local Path</label>
          <div className="flex flex-col gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="text"
              placeholder="Repo URL or /path/to/repo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleOpen(); }}
              disabled={busy || disabled}
            />
            <Button 
              variant="secondary" 
              onClick={() => { fetchRepos(); setShowSelectModal(true); }} 
              disabled={busy || disabled}
              className="w-full"
              size="sm"
              title="Browse and select from local repositories"
            >
              Browse Local...
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="commits-limit" className="text-xs text-gray-500 block mb-1">Commits to fetch</label>
          <input
            id="commits-limit"
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              let n = Math.floor(v);
              if (n < 1) n = 1; if (n > 1000) n = 1000;
              setLimit(n);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white text-sm"
            disabled={busy || disabled}
          />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            variant="primary" 
            onClick={handleOpen} 
            disabled={busy || disabled || !url.trim()}
            fullWidth
            size="sm"
          >
            Open Repo
          </Button>
            <Button 
              variant="secondary" 
              onClick={handleClone} 
              disabled={busy || disabled || !url.trim()}
              fullWidth
              size="sm"
            >
              Clone Repo
            </Button>
        </div>
      </div>

      <Modal
        open={showSelectModal}
        title="Select Local Repository"
        onClose={() => setShowSelectModal(false)}
        onContinue={() => setShowSelectModal(false)} // Modal component requires onContinue but we don't really need it for selection
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Base Directory to Scan</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseDir}
                onChange={(e) => setBaseDir(e.target.value)}
                placeholder="e.g. repos or /home/user/projects"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              />
              <Button variant="secondary" onClick={fetchRepos} disabled={loadingRepos} title="Re-scan the base directory for repositories">Scan</Button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingRepos ? (
              <div className="text-center py-4">Loading repositories...</div>
            ) : localRepos.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No repositories found in {baseDir}.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {localRepos.map((repo) => (
                  <button
                    key={repo}
                    onClick={() => handleSelectRepo(repo)}
                    className="text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium text-gray-700 group-hover:text-blue-600">{repo}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-400">{baseDir}/{repo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
