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

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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
      {/* Model selection and Analyze */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <ModelSelector
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          models={models}
          disabled={gitLoading}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => resetRepository()}
            disabled={sending || gitLoading || !hasActiveRepo}
            title="Reset repository to default branch and delete temporary branches"
          >
            Reset Repo
          </Button>
          <Button
            ref={analyzeButtonRef}
            variant="primary"
            onClick={checkoutSelectedCommits}
            disabled={sending || commitLog.length === 0 || gitLoading}
            title="Checkout selected commits and send them to AI for code review"
          >
            {selectedCommitOids.size > 0
              ? `Analyze with AI (${selectedCommitOids.size} selected)`
              : "Analyze with AI"}
          </Button>
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
      <GitConsole entries={gitEntries} onClear={() => setGitEntries((_prev) => [])} />
      </div>
    </div>
  );
};

export default GitView;
