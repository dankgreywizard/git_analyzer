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
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';

describe('Header', () => {
  const defaultProps = {
    currentTab: 'chat' as const,
    setCurrentTab: vi.fn(),
    status: { color: 'gray' as const, text: 'Ready' },
    onNewChat: vi.fn(),
    onToggleSidebar: vi.fn(),
  };

  it('renders correctly in chat tab', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('renders correctly in git tab', () => {
    render(<Header {...defaultProps} currentTab="git" />);
    expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
    expect(screen.getByText('git')).toBeInTheDocument();
  });

  it('calls onNewChat when "New Chat" button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });

  it('calls onToggleSidebar when sidebar button is clicked', () => {
    render(<Header {...defaultProps} />);
    // The sidebar toggle is only visible on small screens (md:hidden)
    const toggleButton = screen.getByTitle('Toggle menu');
    fireEvent.click(toggleButton);
    expect(defaultProps.onToggleSidebar).toHaveBeenCalled();
  });
});
