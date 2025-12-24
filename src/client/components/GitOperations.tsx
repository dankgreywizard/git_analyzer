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

  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/repos");
      const data = await res.json();
      if (res.ok && Array.isArray(data.repos)) {
        setLocalRepos(data.repos);
      }
    } catch (e) {
      console.error("Failed to fetch repos", e);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const handleSelectRepo = (repoName: string) => {
    setUrl(`repos/${repoName}`);
    setShowSelectModal(false);
  };

  const pushResult = useCallback((entry: any) => {
    onResult?.({ id: String(Date.now()) + Math.random().toString(36).slice(2), time: Date.now(), ...entry });
  }, [onResult]);

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
      const res = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Clone failed");
      pushResult({ op: "clone", status: "success", request: { url: repoUrl }, data });
      updateStatus?.("Ready", "green");
    } catch (e: any) {
      pushResult({ op: "clone", status: "error", request: { url: repoUrl }, error: e?.message || String(e) });
      updateStatus?.("Clone failed", "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, pushResult, updateStatus, disabled, onBusyChange]);

  const handleOpen = useCallback(async () => {
    const repoUrl = url.trim();
    if (!repoUrl) {
      updateStatus?.("Enter a repository URL or local path", "yellow");
      return;
    }
    if (disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    updateStatus?.("Opening...", "yellow");
    try {
      // Determine if it's a URL or a path
      let isUrl = false;
      try { new URL(repoUrl); isUrl = true; } catch {}
      
      const res = await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUrl ? { url: repoUrl } : { dir: repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Open failed");
      pushResult({ op: "open", status: "success", request: { url: isUrl ? repoUrl : undefined, dir: !isUrl ? repoUrl : undefined }, data });
      updateStatus?.("Ready", "green");
      
      // Automatically trigger log after opening
      await handleLog(true);
    } catch (e: any) {
      pushResult({ op: "open", status: "error", request: { url: repoUrl }, error: e?.message || String(e) });
      updateStatus?.("Open failed", "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, pushResult, updateStatus, disabled, onBusyChange]);

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
      const res = await fetch(`/api/log?${queryParam}&limit=${reqLimit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Log failed");
      pushResult({ op: "log", status: "success", request: { url: repoUrl, limit: reqLimit }, data });
      onLogData?.(data);
      updateStatus?.("Ready", "green");
    } catch (e: any) {
      pushResult({ op: "log", status: "error", request: { url: repoUrl, limit }, error: e?.message || String(e) });
      updateStatus?.("Log failed", "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, limit, pushResult, updateStatus, disabled, onBusyChange, onLogData]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Repository URL or Local Path</label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="text"
              placeholder="https://github.com/user/repo.git or repos/name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
              onKeyDown={(e) => { if (e.key === "Enter") handleOpen(); }}
              disabled={busy || disabled}
            />
            <Button 
              variant="secondary" 
              onClick={() => { fetchRepos(); setShowSelectModal(true); }} 
              disabled={busy || disabled}
              className="whitespace-nowrap"
            >
              Select...
            </Button>
          </div>
        </div>
        <div className="w-full md:w-40">
          <label className="text-xs text-gray-500 block mb-1">Commits to fetch</label>
          <input
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
            disabled={busy || disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="danger" onClick={handleClone} disabled={busy || disabled}>Clone</Button>
          <Button variant="primary" onClick={handleOpen} disabled={busy || disabled}>Open</Button>
          <Button variant="dark" onClick={() => handleLog()} disabled={busy || disabled}>Log</Button>
        </div>
      </div>

      <Modal
        open={showSelectModal}
        title="Select Local Repository"
        onClose={() => setShowSelectModal(false)}
        onContinue={() => setShowSelectModal(false)} // Modal component requires onContinue but we don't really need it for selection
      >
        <div className="space-y-2">
          {loadingRepos ? (
            <div className="text-center py-4">Loading repositories...</div>
          ) : localRepos.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No repositories found in repos/ directory.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {localRepos.map((repo) => (
                <button
                  key={repo}
                  onClick={() => handleSelectRepo(repo)}
                  className="text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between group"
                >
                  <span className="font-medium text-gray-700 group-hover:text-blue-600">{repo}</span>
                  <span className="text-xs text-gray-400 group-hover:text-blue-400">repos/{repo}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
