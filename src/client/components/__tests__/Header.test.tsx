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
    expect(screen.getByText('Git Review Assistant')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('renders correctly in git tab', () => {
    render(<Header {...defaultProps} currentTab="git" />);
    expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
    expect(screen.getByText('git')).toBeInTheDocument();
  });

  it('calls setCurrentTab when menu items are clicked', async () => {
    render(<Header {...defaultProps} />);
    
    // Open menu
    fireEvent.click(screen.getByText('chat'));
    
    // Click Git option
    fireEvent.click(screen.getByText('Git'));
    expect(defaultProps.setCurrentTab).toHaveBeenCalledWith('git');
    
    // Open menu again
    fireEvent.click(screen.getByText('chat'));
    
    // Click Settings option
    fireEvent.click(screen.getByText('Settings'));
    expect(defaultProps.setCurrentTab).toHaveBeenCalledWith('settings');
  });

  it('calls onNewChat when "New Chat" button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });

  it('calls onToggleSidebar when sidebar button is clicked', () => {
    render(<Header {...defaultProps} />);
    // The sidebar toggle is only visible on small screens (md:hidden)
    // But testing-library should still find it
    const toggleButton = screen.getByTitle('Toggle chat history');
    fireEvent.click(toggleButton);
    expect(defaultProps.onToggleSidebar).toHaveBeenCalled();
  });
});
