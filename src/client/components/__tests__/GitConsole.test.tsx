import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GitConsole from '../GitConsole';
import React from 'react';
import { GitEntry } from '../../../types/git';

const mockEntries: GitEntry[] = [
  { id: '1', time: Date.now(), op: 'clone', request: {}, status: 'success', data: { dir: 'repo' } },
  { id: '2', time: Date.now() + 1, op: 'commit', request: {}, status: 'error', error: 'Failed' },
];

describe('GitConsole', () => {
  it('renders "No operations yet." when empty', () => {
    render(<GitConsole entries={[]} />);
    expect(screen.getByText('No operations yet.')).toBeInTheDocument();
  });

  it('renders operation entries', () => {
    render(<GitConsole entries={mockEntries} />);
    expect(screen.getByText(/clone/)).toBeInTheDocument();
    expect(screen.getByText(/commit/)).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(<GitConsole entries={mockEntries} onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalled();
  });
});
