import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatView from '../ChatView';

describe('ChatView', () => {
  const defaultProps = {
    messages: [],
    inputValue: '',
    setInputValue: vi.fn(),
    sending: false,
    onSend: vi.fn(),
    onCancel: vi.fn(),
    chatContainerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
  };

  it('renders "Start a conversation" when messages are empty', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('renders messages when they exist', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];
    render(<ChatView {...defaultProps} messages={messages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });

  it('calls setInputValue when typing', () => {
    render(<ChatView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'New message' } });
    expect(defaultProps.setInputValue).toHaveBeenCalledWith('New message');
  });

  it('calls onSend when send button is clicked', () => {
    render(<ChatView {...defaultProps} inputValue="Test" />);
    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it('disables send button when sending or input is empty', () => {
    const { rerender } = render(<ChatView {...defaultProps} inputValue="" />);
    expect(screen.getByLabelText('Send message')).toBeDisabled();

    rerender(<ChatView {...defaultProps} inputValue="Test" sending={true} />);
    expect(screen.getByLabelText('Send message')).toBeDisabled();

    rerender(<ChatView {...defaultProps} inputValue="Test" sending={false} />);
    expect(screen.getByLabelText('Send message')).not.toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked and sending is true', () => {
    render(<ChatView {...defaultProps} sending={true} />);
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).not.toBeDisabled();
    fireEvent.click(cancelButton);
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('disables cancel button when not sending', () => {
    render(<ChatView {...defaultProps} sending={false} />);
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('calls onSend when Enter is pressed without Shift', () => {
    render(<ChatView {...defaultProps} inputValue="Test" />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it('does not call onSend when Enter is pressed with Shift', () => {
    const onSendMock = vi.fn();
    render(<ChatView {...defaultProps} onSend={onSendMock} inputValue="Test" />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSendMock).not.toHaveBeenCalled();
  });

  it('updates scrollTop when messages change', () => {
    const { rerender } = render(
      <ChatView {...defaultProps} messages={[]} />
    );

    const container = screen.getByTestId('chat-container') as HTMLDivElement;
    // Mock scrollHeight and initial scrollTop
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true });

    const newMessages = [{ role: 'user' as const, content: 'Hello' }];
    rerender(<ChatView {...defaultProps} messages={newMessages} />);

    expect(container.scrollTop).toBe(500);
  });

  it('has id="chat-container"', () => {
    render(<ChatView {...defaultProps} />);
    const container = screen.getByTestId('chat-container');
    expect(container.id).toBe('chat-container');
  });
});
