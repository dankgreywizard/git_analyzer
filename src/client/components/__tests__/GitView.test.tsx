import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GitView from '../GitView';

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
    sending: false,
    commitLog: [],
    selectedCommitOids: new Set<string>(),
    gitEntries: [],
  };

  it('renders correctly', () => {
    render(<GitView {...defaultProps} />);
    expect(screen.getByText('AI Model')).toBeInTheDocument();
    expect(screen.getByText('Analyze with AI')).toBeInTheDocument();
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

  it('calls analyzeCommitsWithAI when analyze button is clicked', () => {
    const commitLog = [{ oid: '1', message: 'commit 1', author: { name: 'Author' }, date: '2023-01-01' }];
    render(<GitView {...defaultProps} commitLog={commitLog} />);
    const button = screen.getByText('Analyze with AI');
    fireEvent.click(button);
    expect(defaultProps.analyzeCommitsWithAI).toHaveBeenCalled();
  });

  it('disables analyze button when sending, gitLoading, or commitLog is empty', () => {
    const { rerender } = render(<GitView {...defaultProps} commitLog={[]} />);
    expect(screen.getByText('Analyze with AI')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} sending={true} />);
    expect(screen.getByText('Analyze with AI')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} gitLoading={true} />);
    expect(screen.getByText('Analyze with AI')).toBeDisabled();

    rerender(<GitView {...defaultProps} commitLog={[{ oid: '1' }]} sending={false} gitLoading={false} />);
    expect(screen.getByText('Analyze with AI')).not.toBeDisabled();
  });

  it('shows selected count on analyze button', () => {
    const selected = new Set(['1', '2']);
    render(<GitView {...defaultProps} commitLog={[{ oid: '1' }, { oid: '2' }]} selectedCommitOids={selected} />);
    expect(screen.getByText('Analyze with AI (2 selected)')).toBeInTheDocument();
  });
});
