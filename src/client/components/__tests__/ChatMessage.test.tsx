import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatMessage from '../ChatMessage';
import React from 'react';

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(<ChatMessage role="user" content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hello').parentElement).toHaveClass('max-h-96');
    expect(screen.getByText('Hello').closest('.rounded-xl')).toHaveClass('bg-blue-600');
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage role="assistant" content="Hi there" />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hi there').parentElement).toHaveClass('max-h-96');
    expect(screen.getByText('Hi there').closest('.rounded-xl')).toHaveClass('bg-white');
  });

  it('renders system message correctly', () => {
    render(<ChatMessage role="system" content="System instruction" />);
    expect(screen.getByText('System instruction')).toBeInTheDocument();
    expect(screen.getByText('System instruction').parentElement).toHaveClass('max-h-96');
    expect(screen.getByText('System instruction').closest('.rounded-xl')).toHaveClass('bg-white');
  });
});
