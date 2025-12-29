import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatHistory from '../ChatHistory';
import React from 'react';
import { Chat } from '../../../types/chat';

const mockChats: Chat[] = [
  { id: '1', messages: [{ role: 'user', content: 'Chat 1 message' }], time: Date.now() },
  { id: '2', messages: [{ role: 'user', content: 'Chat 2 message' }], time: Date.now() - 1000 },
];

describe('ChatHistory', () => {
  it('renders a list of chats', () => {
    render(<ChatHistory chats={mockChats} />);
    expect(screen.getByText(/Chat 1 message/)).toBeInTheDocument();
    expect(screen.getByText(/Chat 2 message/)).toBeInTheDocument();
  });

  it('calls onSelect when a chat is clicked', () => {
    const handleSelect = vi.fn();
    render(<ChatHistory chats={mockChats} onSelect={handleSelect} />);
    fireEvent.click(screen.getByText(/Chat 1 message/));
    expect(handleSelect).toHaveBeenCalledWith('1');
  });

  it('calls onNewChat when New button is clicked', () => {
    const handleNewChat = vi.fn();
    render(<ChatHistory chats={mockChats} onNewChat={handleNewChat} />);
    fireEvent.click(screen.getByText('New'));
    expect(handleNewChat).toHaveBeenCalled();
  });
});
