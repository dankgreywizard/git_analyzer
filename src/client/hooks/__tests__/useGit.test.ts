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
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGit } from '../useGit';

describe('useGit', () => {
  const mockUpdateStatus = vi.fn();
  const mockSendAnalysisRequest = vi.fn();
  const mockScrollToBottom = vi.fn();
  const mockSetCurrentChatId = vi.fn();
  const mockSetCurrentTab = vi.fn();

  const defaultProps = {
    commitLog: [
      { oid: '123', author: { name: 'Alice' }, message: 'Commit 1' },
      { oid: '456', author: { name: 'Bob' }, message: 'Commit 2' },
    ],
    selectedModel: 'test-model',
    currentChatId: null,
    setCurrentChatId: mockSetCurrentChatId,
    setCurrentTab: mockSetCurrentTab,
    updateStatus: mockUpdateStatus,
    sendAnalysisRequest: mockSendAnalysisRequest,
    scrollToBottom: mockScrollToBottom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useGit(defaultProps));
    expect(result.current.gitEntries).toEqual([]);
    expect(result.current.selectedCommitOids).toBeInstanceOf(Set);
    expect(result.current.selectedCommitOids.size).toBe(0);
    expect(result.current.gitLoading).toBe(false);
  });

  it('should toggle commit selection', () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
      result.current.setSelectedCommitOids(new Set(['123']));
    });
    
    expect(result.current.selectedCommitOids.has('123')).toBe(true);
    expect(result.current.selectedCommitOids.size).toBe(1);
  });

  it('should trigger AI analysis for everything if none selected', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    await act(async () => {
      await result.current.checkoutSelectedCommits();
    });

    expect(mockSetCurrentTab).toHaveBeenCalledWith('chat');
    expect(mockSendAnalysisRequest).toHaveBeenCalled();
    const payload = mockSendAnalysisRequest.mock.calls[0][1];
    expect(payload.commits.length).toBe(2);
  });

  it('should handle missing oid in analyzeCommitsWithAI filtering', async () => {
    const props = {
        ...defaultProps,
        commitLog: [
            { commit: { oid: '123' } },
            { something_else: '456' } // missing oid
        ]
    };
    const { result } = renderHook(() => useGit(props));
    
    act(() => {
        result.current.setSelectedCommitOids(new Set(['123', '456']));
    });

    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockSendAnalysisRequest).toHaveBeenCalled();
    const payload = mockSendAnalysisRequest.mock.calls[0][1];
    expect(payload.commits.length).toBe(1); // Only 123 should be included
    expect(payload.commits[0].commit.oid).toBe('123');
  });

  it('should checkout selected commits and then analyze', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    // 1. Set an active repo
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            data: { dir: 'repos/test' },
            request: { dir: 'repos/test' }
        }]);
    });

    // 2. Select a commit
    act(() => {
      result.current.setSelectedCommitOids(new Set(['123']));
    });

    // 3. Mock checkout API
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ branch: 'branch-123' }] }),
    });

    // 4. Trigger checkout
    await act(async () => {
      await result.current.checkoutSelectedCommits();
    });

    // 5. Verify checkout call
    expect(global.fetch).toHaveBeenCalledWith('/api/checkout-commits', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dir: 'repos/test', commits: ['123'] })
    }));

    // 6. Verify it proceeded to analysis
    expect(mockSetCurrentTab).toHaveBeenCalledWith('chat');
    expect(mockSendAnalysisRequest).toHaveBeenCalled();
    const payload = mockSendAnalysisRequest.mock.calls[0][1];
    expect(payload.commits).toHaveLength(1);
    expect(payload.commits[0].oid).toBe('123');
    
    // 7. Verify entries updated
    expect(result.current.gitEntries).toHaveLength(2);
    expect(result.current.gitEntries[1].op).toBe('checkout-multiple');
    expect(result.current.gitEntries[1].status).toBe('success');
  });

  it('should handle checkout failure', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            data: { dir: 'repos/test' },
            request: { dir: 'repos/test' }
        }]);
        result.current.setSelectedCommitOids(new Set(['123']));
    });

    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Git error' }),
    });

    await act(async () => {
      await result.current.checkoutSelectedCommits();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('Checkout failed', 'red');
    expect(result.current.gitEntries).toHaveLength(2);
    expect(result.current.gitEntries[1].status).toBe('error');
    expect(result.current.gitEntries[1].error).toBe('Git error');
    // Should NOT proceed to analysis
    expect(mockSendAnalysisRequest).not.toHaveBeenCalled();
  });

  it('should manage gitLoading state during checkout', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            data: { dir: 'repos/test' },
            request: { dir: 'repos/test' }
        }]);
        result.current.setSelectedCommitOids(new Set(['123']));
    });

    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = () => resolve({
        ok: true,
        json: async () => ({ results: [] }),
      });
    });
    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    let checkoutPromise: Promise<void>;
    act(() => {
      checkoutPromise = result.current.checkoutSelectedCommits();
    });

    expect(result.current.gitLoading).toBe(true);

    await act(async () => {
      resolveFetch();
      await checkoutPromise!;
    });

    expect(result.current.gitLoading).toBe(false);
  });

  it('should fail checkout if no active repository', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
      result.current.setSelectedCommitOids(new Set(['123']));
    });

    await act(async () => {
      await result.current.checkoutSelectedCommits();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('No active repository to checkout from', 'red');
  });

  it('should reset repository successfully and manage gitLoading', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    // Simulate successful open to have an active repo
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            request: { dir: 'repos/test' },
        }]);
    });

    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = () => resolve({
        ok: true,
        json: async () => ({ branch: 'main' }),
      });
    });
    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    let resetPromise: Promise<void>;
    act(() => {
        resetPromise = result.current.resetRepository();
    });

    expect(result.current.gitLoading).toBe(true);

    await act(async () => {
        resolveFetch();
        await resetPromise!;
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('Repository reset to main', 'green');
    expect(result.current.gitLoading).toBe(false);
    expect(result.current.gitEntries).toHaveLength(2);
    expect(result.current.gitEntries[1].op).toBe('reset');
  });

  it('should handle reset failure', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            request: { dir: 'repos/test' },
        }]);
    });

    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Reset failed error' }),
    });

    await act(async () => {
        await result.current.resetRepository();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('Reset failed: Reset failed error', 'red');
    expect(result.current.gitLoading).toBe(false);
  });

  it('should handle reset exception', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            request: { dir: 'repos/test' },
        }]);
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
        await result.current.resetRepository();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('Reset failed: Network error', 'red');
    expect(result.current.gitLoading).toBe(false);
  });

  it('should handle checkout exception', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    act(() => {
        result.current.setGitEntries([{
            id: '1',
            time: Date.now(),
            op: 'open',
            status: 'success',
            data: { dir: 'repos/test' },
            request: { dir: 'repos/test' }
        }]);
        result.current.setSelectedCommitOids(new Set(['123']));
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.checkoutSelectedCommits();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('Checkout failed', 'red');
    expect(result.current.gitEntries).toHaveLength(2);
    expect(result.current.gitEntries[1].status).toBe('error');
    expect(result.current.gitEntries[1].error).toBe('Network error');
  });

  it('should handle empty author name in analysis', async () => {
    const props = {
        ...defaultProps,
        commitLog: [
            { oid: '123', commit: { author: { name: '' } } }
        ]
    };
    const { result } = renderHook(() => useGit(props));
    
    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockSendAnalysisRequest).toHaveBeenCalledWith(
        expect.stringContaining('authors: Unknown'),
        expect.any(Object),
        expect.any(Function),
        expect.any(Function)
    );
  });

  it('should handle missing author object in analysis', async () => {
    const props = {
        ...defaultProps,
        commitLog: [
            { oid: '123' }
        ]
    };
    const { result } = renderHook(() => useGit(props));
    
    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockSendAnalysisRequest).toHaveBeenCalledWith(
        expect.stringContaining('authors: Unknown'),
        expect.any(Object),
        expect.any(Function),
        expect.any(Function)
    );
  });

  it('should handle many authors in analysis', async () => {
    const authors = Array.from({ length: 12 }, (_, i) => ({ name: `Author ${i}` }));
    const props = {
        ...defaultProps,
        commitLog: authors.map((a, i) => ({ oid: String(i), author: a }))
    };
    const { result } = renderHook(() => useGit(props));
    
    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockSendAnalysisRequest).toHaveBeenCalledWith(
        expect.stringContaining('+2 more'),
        expect.any(Object),
        expect.any(Function),
        expect.any(Function)
    );
  });

  it('should handle no commits to analyze', async () => {
    const props = {
        ...defaultProps,
        commitLog: []
    };
    const { result } = renderHook(() => useGit(props));
    
    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('No commits to analyze', 'yellow');
    expect(mockSendAnalysisRequest).not.toHaveBeenCalled();
  });

  it('should handle no selected commits to analyze', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    // Select an OID that doesn't exist in commitLog
    act(() => {
        result.current.setSelectedCommitOids(new Set(['non-existent']));
    });

    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('No selected commits to analyze', 'yellow');
    expect(mockSendAnalysisRequest).not.toHaveBeenCalled();
  });

  it('should set current chat ID if missing during analysis', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    await act(async () => {
        await result.current.analyzeCommitsWithAI();
    });

    expect(mockSetCurrentChatId).toHaveBeenCalled();
  });

  it('should fail reset if no active repository', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    await act(async () => {
        await result.current.resetRepository();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('No active repository to reset', 'red');
  });
});
