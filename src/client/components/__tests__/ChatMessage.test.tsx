import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatMessage from '../ChatMessage';
import React from 'react';

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(<ChatMessage role="user" content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hello').closest('div')).toHaveClass('bg-blue-600');
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage role="assistant" content="Hi there" />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hi there').closest('div')).toHaveClass('bg-white');
  });
});
