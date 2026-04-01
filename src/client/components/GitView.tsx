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
import React from "react";
import GitOperations from "./GitOperations";
import GitConsole from "./GitConsole";
import CommitList from "./CommitList";
import Button from "./Button";
import { GitEntry } from "../../types/git";

interface GitViewProps {
  gitLoading: boolean;
  updateStatus: (text: string, color?: "gray" | "yellow" | "green" | "red") => void;
  setGitEntries: (updater: (prev: GitEntry[]) => GitEntry[]) => void;
  setCommitLog: (commits: any[]) => void;
  setSelectedCommitOids: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  analyzeButtonRef: React.RefObject<HTMLButtonElement | null>;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: string[];
  analyzeCommitsWithAI: () => void;
  checkoutSelectedCommits: () => void;
  resetRepository: () => void;
  setGitLoading: (loading: boolean) => void;
  sending: boolean;
  commitLog: any[];
  selectedCommitOids: Set<string>;
  gitEntries: GitEntry[];
}

/**
 * Component to select an AI model for code analysis.
 * @param props The component properties.
 * @returns The rendered ModelSelector component.
 */
const ModelSelector: React.FC<{
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: string[];
  disabled?: boolean;
}> = ({ selectedModel, setSelectedModel, models, disabled }) => (
  <div className="flex-1 min-w-[12rem]">
    <label className="text-xs text-gray-500 block mb-1">AI Model</label>
    <select
      value={selectedModel}
      onChange={(e) => setSelectedModel(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
      disabled={disabled}
    >
      {models.length === 0 ? (
        <option value={selectedModel}>{selectedModel}</option>
      ) : (
        models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))
      )}
    </select>
  </div>
);

/**
 * View component for managing Git operations and analyzing commits.
 * @param props The component properties.
 * @returns The rendered GitView component.
 */
const GitView: React.FC<GitViewProps> = ({
  gitLoading,
  updateStatus,
  setGitEntries,
  setCommitLog,
  setSelectedCommitOids,
  analyzeButtonRef,
  selectedModel,
  setSelectedModel,
  models,
  analyzeCommitsWithAI,
  checkoutSelectedCommits,
  resetRepository,
  setGitLoading,
  sending,
  commitLog,
  selectedCommitOids,
  gitEntries,
}) => {
  const hasActiveRepo = gitEntries.some(e => (e.op === 'open' || e.op === 'clone' || e.op === 'checkout-multiple') && e.status === 'success');

  const currentOpEntry = gitEntries[gitEntries.length - 1];
  const currentOpText = gitLoading 
    ? (currentOpEntry?.op === 'clone' ? 'Cloning...' 
      : currentOpEntry?.op === 'open' ? 'Opening...' 
      : currentOpEntry?.op === 'fetch' ? 'Fetching Repository...' 
      : currentOpEntry?.op === 'checkout-multiple' ? 'Analyzing Commits...'
      : 'Processing...')
    : (currentOpEntry?.status === 'success' ? 'Success'
      : currentOpEntry?.status === 'error' ? 'Failure'
      : 'Idle');

  const currentOpColor = gitLoading
    ? 'text-gray-900'
    : (currentOpEntry?.status === 'success' ? 'text-green-600'
      : currentOpEntry?.status === 'error' ? 'text-red-600'
      : 'text-gray-900');

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Loading overlay */}
      {gitLoading && (
        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-700">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-sm font-medium">Loading…</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left column: Operations and Configuration */}
        <div className="w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto p-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Repository</h3>
            <GitOperations
              updateStatus={updateStatus}
              onResult={(entry) => setGitEntries((prev) => [...prev, entry])}
              onLogData={(data) => {
                const commits = Array.isArray(data?.commits) ? data.commits : [];
                setCommitLog(commits);
                setSelectedCommitOids(new Set<string>());
                // Focus analyze button after log is loaded
                if (commits.length > 0) {
                  setTimeout(() => {
                    analyzeButtonRef.current?.focus();
                  }, 100);
                }
              }}
              onBusyChange={(v) => {
                // Sync GitOperations' busy state with GitView's loading state
                setGitLoading(v);
                if (v) {
                  updateStatus?.("Loading…", "yellow");
                }
              }}
              disabled={gitLoading}
            />
          </section>

          <section className="pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">AI Analysis Settings</h3>
            <div className="space-y-4">
              <ModelSelector
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                models={models}
                disabled={gitLoading}
              />
              <div className="flex flex-col gap-2">
                <Button
                  ref={analyzeButtonRef}
                  variant="primary"
                  onClick={checkoutSelectedCommits}
                  disabled={sending || commitLog.length === 0 || gitLoading}
                  className="w-full"
                  title="Checkout selected commits and send them to AI for code review"
                >
                  {selectedCommitOids.size > 0
                    ? `Analyze (${selectedCommitOids.size})`
                    : "Analyze Commits"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => resetRepository()}
                  disabled={sending || gitLoading || !hasActiveRepo}
                  className="w-full"
                  title="Reset repository to default branch and delete temporary branches"
                >
                  Reset Repo
                </Button>
              </div>
            </div>
          </section>

          <section className="pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Console</h3>
            <GitConsole entries={gitEntries} onClear={() => setGitEntries((_prev) => [])} />
          </section>
        </div>

        {/* Right column: Commit List */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Commit History</h3>
                {commitLog.length > 0 && (
                  <span className="text-xs text-gray-500">{commitLog.length} commits found</span>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Current Status</div>
                <div className={`text-2xl font-bold ${currentOpColor}`}>
                  {currentOpText}
                </div>
              </div>
            </div>
            <CommitList
              commits={commitLog}
              disabled={gitLoading}
              selectedOids={selectedCommitOids}
              onToggleCommit={(oid, checked) => {
                setSelectedCommitOids((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(oid);
                  else next.delete(oid);
                  return next;
                });
              }}
              onToggleAllVisible={(oids, checked) => {
                setSelectedCommitOids((prev) => {
                  const next = new Set(prev);
                  for (const o of oids) {
                    if (!o) continue;
                    if (checked) next.add(o);
                    else next.delete(o);
                  }
                  return next;
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitView;
