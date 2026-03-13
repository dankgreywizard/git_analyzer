import { useState, useCallback } from 'react';
import { GitEntry } from '../../types/git';

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

  const analyzeCommitsWithAI = useCallback(async (overriddenCommits?: any[]) => {
    const commitsToAnalyze = overriddenCommits || commitLog;
    if (!Array.isArray(commitsToAnalyze) || commitsToAnalyze.length === 0) {
      updateStatus('No commits to analyze', 'yellow');
      return;
    }

    // Filter to selected commits if any are selected (and not overridden)
    const forAnalysis = !overriddenCommits && selectedCommitOids.size > 0
      ? commitsToAnalyze.filter((c) => {
          const oid = c?.oid || c?.commit?.oid;
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
        .map((c) => (c?.author?.name || c?.commit?.author?.name || 'Unknown'))
        .map((s) => (typeof s === 'string' ? s.trim() : 'Unknown'))
        .filter((s) => s && s.length > 0)
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

  const checkoutSelectedCommits = useCallback(async () => {
    if (selectedCommitOids.size === 0) {
      updateStatus('No commits selected for checkout', 'yellow');
      return;
    }
    const lastOp = [...gitEntries].reverse().find(e => (e.op === 'open' || e.op === 'clone') && e.status === 'success');
    if (!lastOp || !lastOp.data?.dir) {
      updateStatus('No active repository to checkout from', 'red');
      return;
    }

    const dir = lastOp.data.dir;
    const oids = Array.from(selectedCommitOids);
    
    setGitLoading(true);
    updateStatus(`Checking out ${oids.length} commits...`, 'yellow');
    
    try {
      const res = await fetch('/api/checkout-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, commits: oids }),
      });
      const data = await res.json();
      if (res.ok) {
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
        const forAnalysis = commitLog.filter((c) => {
          const oid = c?.oid || c?.commit?.oid;
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
    } catch (e: any) {
      setGitEntries(prev => [...prev, {
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        time: Date.now(),
        op: 'checkout-multiple',
        status: 'error',
        request: { dir, commits: oids },
        error: e?.message || String(e)
      }]);
      updateStatus('Checkout failed', 'red');
    } finally {
      setGitLoading(false);
    }
  }, [selectedCommitOids, gitEntries, updateStatus, analyzeCommitsWithAI, commitLog]);

  return {
    gitEntries,
    setGitEntries,
    selectedCommitOids,
    setSelectedCommitOids,
    gitLoading,
    setGitLoading,
    analyzeCommitsWithAI,
    checkoutSelectedCommits,
  };
}
