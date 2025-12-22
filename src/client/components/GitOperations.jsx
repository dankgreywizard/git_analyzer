import React, { useCallback, useState } from "react";
import Button from "./Button.jsx";

export default function GitOperations({ onResult, updateStatus, onLogData, onBusyChange, disabled = false }) {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(25); // number of commits to fetch (1..1000)
  const [busy, setBusy] = useState(false);

  const pushResult = useCallback((entry) => {
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
    } catch (e) {
      pushResult({ op: "clone", status: "error", request: { url: repoUrl }, error: e?.message || String(e) });
      updateStatus?.("Clone failed", "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, pushResult, updateStatus]);

  const handleLog = useCallback(async () => {
    const repoUrl = url.trim();
    if (!repoUrl) {
      updateStatus?.("Enter a repository URL", "yellow");
      return;
    }
    if (disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    updateStatus?.("Reading log...", "yellow");
    try {
      // clamp limit to [1, 1000]
      let reqLimit = Number(limit);
      if (!Number.isFinite(reqLimit)) reqLimit = 25;
      if (reqLimit < 1) reqLimit = 1;
      if (reqLimit > 1000) reqLimit = 1000;
      const res = await fetch(`/api/log?url=${encodeURIComponent(repoUrl)}&limit=${reqLimit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Log failed");
      pushResult({ op: "log", status: "success", request: { url: repoUrl, limit: reqLimit }, data });
      onLogData?.(data);
      updateStatus?.("Ready", "green");
    } catch (e) {
      pushResult({ op: "log", status: "error", request: { url: repoUrl, limit }, error: e?.message || String(e) });
      updateStatus?.("Log failed", "red");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }, [url, limit, pushResult, updateStatus]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Repository URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="text"
            placeholder="https://github.com/user/repo.git"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
            onKeyDown={(e) => { if (e.key === "Enter") handleClone(); }}
            disabled={busy || disabled}
          />
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
          <Button variant="dark" onClick={handleLog} disabled={busy || disabled}>Log</Button>
        </div>
      </div>
    </div>
  );
}
