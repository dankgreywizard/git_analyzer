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

  it('should fail reset if no active repository', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    await act(async () => {
        await result.current.resetRepository();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith('No active repository to reset', 'red');
  });
});
