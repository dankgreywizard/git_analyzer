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
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommitList from '../CommitList';
import React from 'react';

describe('CommitList', () => {
  const mockCommits = [
    {
      oid: '1234567890abcdef',
      message: 'feat: add new feature\n\nMore details about the feature.',
      author: { name: 'John Doe', timestamp: 1672531200 },
      files: [{ path: 'src/main.ts', status: 'added' }]
    },
    {
      oid: 'abcdef1234567890',
      message: 'fix: resolve bug',
      author: { name: 'Jane Smith', timestamp: 1672617600 },
      files: [{ path: 'src/utils.ts', status: 'modified' }]
    }
  ];

  it('renders a list of commits', () => {
    render(<CommitList commits={mockCommits} />);
    expect(screen.getByText('feat: add new feature')).toBeInTheDocument();
    expect(screen.getByText('fix: resolve bug')).toBeInTheDocument();
    expect(screen.getByText('1234567')).toBeInTheDocument();
    expect(screen.getByText('Author: John Doe')).toBeInTheDocument();
  });

  it('shows empty state when no commits are provided', () => {
    render(<CommitList commits={[]} />);
    expect(screen.getByText('No commits to display.')).toBeInTheDocument();
  });

  it('toggles commit details', () => {
    render(<CommitList commits={mockCommits} />);
    const toggleButton = screen.getAllByText('Show details')[0];
    fireEvent.click(toggleButton);
    expect(screen.getByText('Full message')).toBeInTheDocument();
    // Use a function matcher to handle the text being broken by elements or having weird whitespace
    // Specifically target the <pre> tag which contains the full message
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'pre' && content.includes('feat: add new feature');
    })).toBeInTheDocument();
    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Hide details'));
    expect(screen.queryByText('Full message')).not.toBeInTheDocument();
  });

  it('calls onToggleCommit when a checkbox is clicked', () => {
    const onToggleCommit = vi.fn();
    render(<CommitList commits={mockCommits} onToggleCommit={onToggleCommit} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Index 0 is "Select All", index 1 is first commit
    fireEvent.click(checkboxes[1]);
    expect(onToggleCommit).toHaveBeenCalledWith('1234567890abcdef', true);
  });

  it('calls onToggleAllVisible when select all checkbox is clicked', () => {
    const onToggleAllVisible = vi.fn();
    render(<CommitList commits={mockCommits} onToggleAllVisible={onToggleAllVisible} />);
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    expect(onToggleAllVisible).toHaveBeenCalledWith(['1234567890abcdef', 'abcdef1234567890'], true);
  });

  it('handles pagination', () => {
    const manyCommits = Array.from({ length: 15 }, (_, i) => ({
      oid: `oid-${i}`,
      message: `commit ${i}`,
      author: { name: 'Author', timestamp: 1672531200 + i }
    }));
    render(<CommitList commits={manyCommits} defaultPageSize={10} />);
    
    expect(screen.getByText('commit 0')).toBeInTheDocument();
    expect(screen.queryByText('commit 10')).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Next'));
    expect(screen.queryByText('commit 0')).not.toBeInTheDocument();
    expect(screen.getByText('commit 10')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByText('commit 0')).toBeInTheDocument();
  });

  it('handles page size changes', () => {
    const manyCommits = Array.from({ length: 5 }, (_, i) => ({
      oid: `oid-${i}`,
      message: `commit ${i}`,
      author: { name: 'Author', timestamp: 1672531200 + i }
    }));
    render(<CommitList commits={manyCommits} defaultPageSize={1} />);
    expect(screen.getByText('commit 0')).toBeInTheDocument();
    expect(screen.queryByText('commit 1')).not.toBeInTheDocument();
    
    const pageSizeInput = screen.getByRole('spinbutton');
    fireEvent.change(pageSizeInput, { target: { value: '10' } });
    expect(screen.getByText('commit 1')).toBeInTheDocument();
  });

  it('handles sorting and alternative data structures', () => {
    const altCommits = [
      {
        commit: {
          oid: 'alt-oid',
          message: 'alt message',
          author: { name: 'Alt Author', timestamp: 1672531200 }
        }
      }
    ];
    render(<CommitList commits={altCommits} />);
    expect(screen.getByText('alt message')).toBeInTheDocument();
    expect(screen.getByText('Author: Alt Author')).toBeInTheDocument();
    expect(screen.getByText(/on/)).toBeInTheDocument();
  });

  it('handles toggle all visible commits', () => {
    const onToggleAllVisible = vi.fn();
    render(<CommitList commits={mockCommits} onToggleAllVisible={onToggleAllVisible} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(onToggleAllVisible).toHaveBeenCalled();
  });

  it('handles page size 0 edge case', () => {
    render(<CommitList commits={mockCommits} defaultPageSize={0} />);
    // When pageSize is 0, visible list is empty.
    expect(screen.getByText('Commits')).toBeInTheDocument();
  });

  it('toggles file diff when clicking on the file badge', () => {
    const commitWithDiff = [
      {
        oid: 'diff-oid',
        message: 'feat: add diff support',
        author: { name: 'Dev', timestamp: 1672531200 },
        files: [{ path: 'src/main.ts', status: 'added', diff: '@@ -0,0 +1,1 @@\n+console.log("hello");' }]
      }
    ];
    render(<CommitList commits={commitWithDiff} />);
    
    // Open details first
    fireEvent.click(screen.getByText('Show details'));
    
    // Find the file badge/icon (it's inside a button)
    const badge = screen.getByText('added');
    const badgeButton = badge.closest('button');
    expect(badgeButton).toBeInTheDocument();
    
    // Initially diff should not be visible
    expect(screen.queryByText('+console.log("hello");')).not.toBeInTheDocument();
    
    // Click to show diff
    fireEvent.click(badgeButton!);
    expect(screen.getByText((content) => content.includes('+console.log("hello");'))).toBeInTheDocument();
    
    // Click to hide diff
    fireEvent.click(badgeButton!);
    expect(screen.queryByText((content) => content.includes('+console.log("hello");'))).not.toBeInTheDocument();
  });

  it('renders large diffs with scrollable container', () => {
    const largeDiff = 'line\n'.repeat(100);
    const commitWithLargeDiff = [
      {
        oid: 'large-diff-oid',
        message: 'feat: add large diff',
        author: { name: 'Dev', timestamp: 1672531200 },
        files: [{ path: 'large.txt', status: 'modified', diff: largeDiff }]
      }
    ];
    render(<CommitList commits={commitWithLargeDiff} />);
    
    fireEvent.click(screen.getByText('Show details'));
    const badge = screen.getByText('modified');
    fireEvent.click(badge.closest('button')!);
    
    const diffContainer = screen.getByText(/line/, { exact: false }).closest('div');
    expect(diffContainer).toHaveClass('max-h-[400px]');
    expect(diffContainer).toHaveClass('overflow-y-auto');
  });
});