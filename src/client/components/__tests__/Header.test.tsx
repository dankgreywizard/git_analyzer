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
