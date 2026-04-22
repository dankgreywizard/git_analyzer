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
import { useState, useCallback } from 'react';
import { GitEntry } from '../../types/git';

/**
 * Properties for the useGit hook.
 */
interface UseGitProps {
  commitLog: any[];
  selectedModel: string;
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  setCurrentTab: (tab: 'chat' | 'git' | 'settings') => void;
  updateStatus: (text: string, color?: 'gray' | 'yellow' | 'green' | 'red') => void;
  sendAnalysisRequest: (
    userMsg: string,
    payload: any,
    onUpdateStatus: (text: string, color?: "gray" | "yellow" | "green" | "red") => void,
    scrollToBottom: () => void
  ) => void;
  scrollToBottom: () => void;
}

/**
 * Hook for managing Git operations and state in the client.
 * Provides functions for cloning, opening, and analyzing repositories.
 * @param props The hook properties.
 * @returns An object containing Git state and operation functions.
 */
export function useGit({
  commitLog,
  selectedModel,
  currentChatId,
  setCurrentChatId,
  setCurrentTab,
  updateStatus,
  sendAnalysisRequest,
  scrollToBottom,
}: UseGitProps) {
  const [gitEntries, setGitEntries] = useState<GitEntry[]>([]);
  const [selectedCommitOids, setSelectedCommitOids] = useState<Set<string>>(() => new Set());
  const [gitLoading, setGitLoading] = useState(false);

  /**
   * Analyzes Git commits using AI.
   * @param overriddenCommits Optional list of commits to analyze, overriding the default commit log.
   */
  const analyzeCommitsWithAI = useCallback(async (overriddenCommits?: any[]) => {
    const commitsToAnalyze = overriddenCommits || commitLog;
    if (!Array.isArray(commitsToAnalyze) || commitsToAnalyze.length === 0) {
      updateStatus('No commits to analyze', 'yellow');
      return;
    }

    // Filter to selected commits if any are selected (and not overridden)
    const forAnalysis = !overriddenCommits && selectedCommitOids.size > 0
      ? commitsToAnalyze.filter((commitEntry) => {
          const oid = commitEntry?.oid || commitEntry?.commit?.oid;
          return oid && selectedCommitOids.has(oid);
        })
      : commitsToAnalyze;

    if (forAnalysis.length === 0) {
      updateStatus('No selected commits to analyze', 'yellow');
      return;
    }

    // Switch to chat and post a user message describing the action
    setCurrentTab('chat');
    
    // Build an author list summary
    const authorsArr = Array.from(new Set(
      forAnalysis
        .map((commitEntry) => (commitEntry?.author?.name || commitEntry?.commit?.author?.name || 'Unknown'))
        .map((authorName) => (typeof authorName === 'string' ? authorName.trim() : 'Unknown'))
        .filter((authorName) => authorName && authorName.length > 0)
    ));
    const shown = authorsArr.slice(0, 10);
    const authorsText = shown.join(', ') + (authorsArr.length > 10 ? `, +${authorsArr.length - 10} more` : '');
    const userMsg = `Analyze ${forAnalysis.length} commits (authors: ${authorsText}) with model ${selectedModel}. Provide a summary, risks, and suggested tests.`;
    
    if (!currentChatId) setCurrentChatId(String(Date.now()));

    sendAnalysisRequest(
      userMsg,
      { commits: forAnalysis, model: selectedModel, maxCommits: 100 },
      updateStatus,
      scrollToBottom
    );
  }, [commitLog, selectedCommitOids, selectedModel, currentChatId, sendAnalysisRequest, updateStatus, scrollToBottom, setCurrentTab, setCurrentChatId]);

  /**
   * Checks out the selected commits into temporary branches for detailed analysis.
   */
  const checkoutSelectedCommits = useCallback(async () => {
    if (selectedCommitOids.size === 0) {
      // If nothing is selected, fall back to analyzing everything.
      analyzeCommitsWithAI();
      return;
    }
    const lastOp = [...gitEntries].reverse().find(entry => (entry.op === 'open' || entry.op === 'clone') && entry.status === 'success');
    if (!lastOp || !lastOp.data?.dir) {
      updateStatus('No active repository to checkout from', 'red');
      return;
    }

    const dir = lastOp.data.dir;
    const oids = Array.from(selectedCommitOids);
    
    setGitLoading(true);
    updateStatus(`Checking out ${oids.length} commits...`, 'yellow');
    
    try {
      const response = await fetch('/api/checkout-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, commits: oids }),
      });
      const data = await response.json();
      if (response.ok) {
        setGitEntries(prev => [...prev, {
          id: String(Date.now()) + Math.random().toString(36).slice(2),
          time: Date.now(),
          op: 'checkout-multiple',
          status: 'success',
          request: { dir, commits: oids },
          data
        }]);
        updateStatus(`Checked out ${oids.length} commits. Starting analysis...`, 'green');
        
        // Proceed to analysis
        // We pass the currently selected commits to ensure consistency
        const forAnalysis = commitLog.filter((commitEntry) => {
          const oid = commitEntry?.oid || commitEntry?.commit?.oid;
          return oid && selectedCommitOids.has(oid);
        });
        analyzeCommitsWithAI(forAnalysis);
      } else {
        const errorMsg = data?.error || 'Checkout failed';
        setGitEntries(prev => [...prev, {
          id: String(Date.now()) + Math.random().toString(36).slice(2),
          time: Date.now(),
          op: 'checkout-multiple',
          status: 'error',
          request: { dir, commits: oids },
          error: errorMsg
        }]);
        updateStatus('Checkout failed', 'red');
      }
    } catch (error: any) {
      setGitEntries(prev => [...prev, {
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        time: Date.now(),
        op: 'checkout-multiple',
        status: 'error',
        request: { dir, commits: oids },
        error: error?.message || String(error)
      }]);
      updateStatus('Checkout failed', 'red');
    } finally {
      setGitLoading(false);
    }
  }, [selectedCommitOids, gitEntries, updateStatus, analyzeCommitsWithAI, commitLog]);

  /**
   * Resets the repository to its original state, optionally deleting temporary branches.
   * @param deleteTempBranches Whether to delete the temporary branches created during analysis.
   */
  const resetRepository = useCallback(async (deleteTempBranches = true) => {
    const lastOp = [...gitEntries].reverse().find(entry => (entry.op === 'open' || entry.op === 'clone' || entry.op === 'checkout-multiple') && entry.status === 'success');
    if (!lastOp || !lastOp.request?.dir) {
      updateStatus('No active repository to reset', 'red');
      return;
    }

    const dir = lastOp.request.dir;
    setGitLoading(true);
    updateStatus('Resetting repository...', 'yellow');

    try {
      const response = await fetch('/api/reset-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, deleteTempBranches }),
      });
      const data = await response.json();
      if (response.ok) {
        setGitEntries(prev => [...prev, {
          id: String(Date.now()) + Math.random().toString(36).slice(2),
          time: Date.now(),
          op: 'reset',
          status: 'success',
          request: { dir, deleteTempBranches },
          data
        }]);
        updateStatus(`Repository reset to ${data.branch}`, 'green');
      } else {
        const errorMsg = data?.error || 'Reset failed';
        updateStatus(`Reset failed: ${errorMsg}`, 'red');
      }
    } catch (error: any) {
      updateStatus(`Reset failed: ${error?.message || String(error)}`, 'red');
    } finally {
      setGitLoading(false);
    }
  }, [gitEntries, updateStatus]);

  return {
    gitEntries,
    setGitEntries,
    selectedCommitOids,
    setSelectedCommitOids,
    gitLoading,
    setGitLoading,
    analyzeCommitsWithAI,
    checkoutSelectedCommits,
    resetRepository,
  };
}
