import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GitView from '../GitView';
import { GitEntry } from '../../../types/git';

vi.mock('../GitOperations', () => ({
  default: ({ onBusyChange }: any) => (
    <div data-testid="git-operations">
      <button onClick={() => onBusyChange(true)}>Simulate Busy</button>
      <button onClick={() => onBusyChange(false)}>Simulate Idle</button>
    </div>
  )
}));

describe('GitView', () => {
  const defaultProps = {
    gitLoading: false,
    updateStatus: vi.fn(),
    setGitEntries: vi.fn(),
    setCommitLog: vi.fn(),
    setSelectedCommitOids: vi.fn(),
    analyzeButtonRef: { current: null } as React.RefObject<HTMLButtonElement | null>,
    selectedModel: 'codellama:latest',
    setSelectedModel: vi.fn(),
    models: ['codellama:latest', 'llama3'],
    analyzeCommitsWithAI: vi.fn(),
    checkoutSelectedCommits: vi.fn(),
    resetRepository: vi.fn(),
    setGitLoading: vi.fn(),
    sending: false,
    commitLog: [],
    selectedCommitOids: new Set<string>(),
    gitEntries: [],
  };

  it('renders correctly', () => {
    render(<GitView {...defaultProps} />);
    expect(screen.getByText('AI Model')).toBeInTheDocument();
    expect(screen.getByText('Analyze Commits')).toBeInTheDocument();
    expect(screen.getByText('Current Status')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('shows current operation text when loading', () => {
    const gitEntries: GitEntry[] = [{ id: '1', op: 'clone', status: 'success', time: Date.now(), request: {} }];
    render(<GitView {...defaultProps} gitLoading={true} gitEntries={gitEntries} />);
    expect(screen.getByText('Cloning...')).toBeInTheDocument();
  });

  it('shows loading overlay when gitLoading is true', () => {
    render(<GitView {...defaultProps} gitLoading={true} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('calls setSelectedModel when model is changed', () => {
    render(<GitView {...defaultProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'llama3' } });
    expect(defaultProps.setSelectedModel).toHaveBeenCalledWith('llama3');
  });

  it('calls checkoutSelectedCommits when analyze button is clicked', () => {
    const commitLog = [{ oid: '1', message: 'commit 1', author: { name: 'Author' }, date: '2023-01-01' }];
    render(<GitView {...defaultProps} commitLog={commitLog} />);
    const button = screen.getByText('Analyze Commits');
    fireEvent.click(button);
    expect(defaultProps.checkoutSelectedCommits).toHaveBeenCalled();
  });

  it('disables analyze button when sending, gitLoading, or commitLog is empty', () => {
    const { rerender } = render(<GitView {...defaultProps} commitLog={[]} />);
    expect(screen.getByText('Analyze Commits')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} sending={true} />);
    expect(screen.getByText('Analyze Commits')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} gitLoading={true} />);
    expect(screen.getByText('Analyze Commits')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} sending={false} gitLoading={false} />);
    expect(screen.getByText('Analyze Commits')).not.toBeDisabled();
  });

  it('shows selected count on analyze button', () => {
    const selected = new Set(['1', '2']);
    render(<GitView {...defaultProps} commitLog={[{ oid: '1' }, { oid: '2' }]} selectedCommitOids={selected} />);
    expect(screen.getByText('Analyze (2)')).toBeInTheDocument();
  });

  it('disables Reset Repo button when no active repo', () => {
    render(<GitView {...defaultProps} gitEntries={[]} />);
    expect(screen.getByText('Reset Repo')).toBeDisabled();
  });

  it('enables Reset Repo button when active repo exists', () => {
    const gitEntries = [{ op: 'open', status: 'success' }] as any;
    render(<GitView {...defaultProps} gitEntries={gitEntries} />);
    expect(screen.getByText('Reset Repo')).not.toBeDisabled();
  });

  it('calls resetRepository when Reset Repo button is clicked', () => {
    const gitEntries = [{ op: 'open', status: 'success' }] as any;
    render(<GitView {...defaultProps} gitEntries={gitEntries} />);
    const button = screen.getByText('Reset Repo');
    fireEvent.click(button);
    expect(defaultProps.resetRepository).toHaveBeenCalled();
  });

  it('calls setGitLoading when onBusyChange is triggered', () => {
    render(<GitView {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Simulate Busy'));
    expect(defaultProps.setGitLoading).toHaveBeenCalledWith(true);
    expect(defaultProps.updateStatus).toHaveBeenCalledWith('Loading…', 'yellow');

    fireEvent.click(screen.getByText('Simulate Idle'));
    expect(defaultProps.setGitLoading).toHaveBeenCalledWith(false);
  });
  it('shows Success in green when last operation succeeded', () => {
    const gitEntries = [{ op: 'clone', status: 'success' }] as any;
    render(<GitView {...defaultProps} gitEntries={gitEntries} />);
    const statusText = screen.getByText('Success');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-green-600');
  });

  it('shows Failure in red when last operation failed', () => {
    const gitEntries = [{ op: 'clone', status: 'error' }] as any;
    render(<GitView {...defaultProps} gitEntries={gitEntries} />);
    const statusText = screen.getByText('Failure');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-red-600');
  });
});
