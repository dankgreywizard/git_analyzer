import React, {useMemo} from "react";

// Entry shape suggestion:
// { id, time, op: 'clone'|'log'|string, request: any, status: 'success'|'error', data?: any, error?: string }
export default function GitConsole({ entries = [], onClear }) {
  const sorted = useMemo(() => [...entries].sort((a,b) => (a.time||0) - (b.time||0)), [entries]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="text-sm font-medium text-gray-700">Git Operations Console</div>
        <button
          className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {sorted.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No operations yet.</div>
        ) : (
          sorted.map((e) => (
            <details key={e.id} className="group p-4">
              <summary className="list-none cursor-pointer flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${e.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {e.status}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {new Date(e.time || Date.now()).toLocaleTimeString()}
                </span>
                <span className="text-sm font-medium text-gray-800">{e.op}</span>
                <span className="text-xs text-gray-500 truncate">{e.request?.url || e.request?.dir || ''}</span>
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Request</div>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{safeStringify(e.request)}</pre>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Response</div>
                  {e.status === 'success' ? (
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{safeStringify(e.data)}</pre>
                  ) : (
                    <div className="text-xs text-red-700">{String(e.error || 'Unknown error')}</div>
                  )}
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

function safeStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
