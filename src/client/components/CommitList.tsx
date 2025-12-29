import React, { useEffect, useMemo, useState } from "react";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "gray" | "green" | "red" | "yellow" | "blue";
}

function Badge({ children, tone = "gray" }: BadgeProps) {
  const map = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
}

function FileBadge({ status }: { status: string }) {
  const tone = status === 'added' ? 'green' : status === 'deleted' ? 'red' : 'blue';
  return <Badge tone={tone}>{status}</Badge>;
}

interface CommitFile {
  path: string;
  status: string;
}

interface Commit {
  oid?: string;
  message?: string;
  author?: {
    name?: string;
    timestamp?: number;
  };
  commit?: {
    oid?: string;
    message?: string;
    author?: {
      name?: string;
      timestamp?: number;
    };
  };
  files?: CommitFile[];
}

interface CommitListProps {
  commits?: Commit[];
  defaultPageSize?: number;
  disabled?: boolean;
  selectedOids?: Set<string>;
  onToggleCommit?: (oid: string, selected: boolean) => void;
  onToggleAllVisible?: (oids: string[], selected: boolean) => void;
}

/**
 * Component to display a list of Git commits with pagination and selection features.
 */
export default function CommitList({
  commits = [],
  defaultPageSize = 10,
  disabled = false,
  selectedOids = new Set(),
  onToggleCommit,
  onToggleAllVisible,
}: CommitListProps) {
  const [openSet, setOpenSet] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const sorted = useMemo(() => {
    const copy = [...commits];
    // commits come in reverse chronological from isomorphic-git already
    return copy;
  }, [commits]);

  useEffect(() => {
    // Reset paging when data changes
    setCurrentPage(1);
    setOpenSet(new Set());
  }, [commits]);

  const totalCommits = sorted.length;
  const totalPages = useMemo(() => (pageSize > 0 ? Math.max(1, Math.ceil(totalCommits / pageSize)) : 1), [totalCommits, pageSize]);
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const visible = useMemo(() => {
    if (!totalCommits) return [];
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize, totalCommits]);

  if (!sorted.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
        No commits to display.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled || visible.length === 0}
              checked={visible.length > 0 && visible.every(c => selectedOids.has(String(c.oid || c.commit?.oid)))}
              onChange={(e) => {
                if (disabled) return;
                const oids = visible.map(c => String(c.oid || c.commit?.oid)).filter(Boolean);
                onToggleAllVisible?.(oids, e.target.checked);
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Commits</span>
          </label>
        </div>
        <div className="text-xs text-gray-500">
          Selected: {Array.isArray(commits) ? commits.filter(c => selectedOids.has(String(c.oid || c.commit?.oid))).length : 0}
        </div>
      </div>
      {/* Pager controls */}
      <div className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            className={`text-sm px-3 py-1.5 rounded border ${safePage <= 1 || disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1 || disabled}
          >
            Prev
          </button>
          <button
            className={`text-sm px-3 py-1.5 rounded border ${safePage >= totalPages || disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages || disabled}
          >
            Next
          </button>
          <div className="text-sm text-gray-600">
            Page {safePage} of {totalPages} <span className="text-gray-400">({totalCommits} total)</span>
          </div>
        </div>
        <div className="md:ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-500">Page size</label>
          <input
            type="number"
            min={1}
            max={100}
            value={pageSize}
            onChange={(e) => {
              if (disabled) return;
              let v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              v = Math.floor(v);
              if (v < 1) v = 1; if (v > 100) v = 100;
              setPageSize(v);
              setCurrentPage(1);
            }}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
            disabled={disabled}
          />
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {visible.map((c, idx) => {
          const id = String(c.oid || c.commit?.oid || idx);
          const author = c.author?.name || c.commit?.author?.name || "Unknown";
          const when = c.author?.timestamp
            ? new Date((c.author.timestamp || 0) * 1000)
            : c.commit?.author?.timestamp
              ? new Date((c.commit.author.timestamp || 0) * 1000)
              : null;
          const subject = (c.message || c.commit?.message || "").split('\n')[0];
          const open = openSet.has(id);
          return (
            <li key={id} className={`p-4 ${selectedOids.has(id) ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    disabled={disabled}
                    checked={selectedOids.has(id)}
                    onChange={(e) => onToggleCommit?.(id, e.target.checked)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{subject || '(no subject)'}</span>
                      <Badge tone="gray">{String(c.oid || '').slice(0, 7)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      <span>Author: {author}</span>
                      {when ? <span>on {when.toLocaleString()}</span> : null}
                    </div>
                  </div>
                </div>
                <button
                  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-700 flex-shrink-0"
                  onClick={() => {
                    const next = new Set(openSet);
                    if (open) next.delete(id); else next.add(id);
                    setOpenSet(next);
                  }}
                  disabled={disabled}
                >
                  {open ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {open && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Full message</div>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{c.message || c.commit?.message || ''}</pre>
                  <div className="mt-3 text-[11px] uppercase tracking-wide text-gray-400 mb-1">Files</div>
                  {Array.isArray(c.files) && c.files.length > 0 ? (
                    <ul className="space-y-1">
                      {c.files.map((f, i) => (
                        <li key={i} className="text-xs text-gray-800 flex items-center gap-2">
                          <FileBadge status={f.status} />
                          <span className="font-mono break-all">{f.path}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">No file changes listed.</div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
