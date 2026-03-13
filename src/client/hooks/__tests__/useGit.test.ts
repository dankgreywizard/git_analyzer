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

  it('should trigger AI analysis', async () => {
    const { result } = renderHook(() => useGit(defaultProps));
    
    await act(async () => {
      await result.current.analyzeCommitsWithAI();
    });

    expect(mockSetCurrentTab).toHaveBeenCalledWith('chat');
    expect(mockSendAnalysisRequest).toHaveBeenCalled();
    const payload = mockSendAnalysisRequest.mock.calls[0][1];
    expect(payload.model).toBe('test-model');
    expect(payload.commits.length).toBe(2);
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
});
