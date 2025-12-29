import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Status from '../Status';
import React from 'react';

describe('Status', () => {
  it('renders with default values', () => {
    render(<Status />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<Status text="Working..." />);
    expect(screen.getByText('Working...')).toBeInTheDocument();
  });

  it('renders with correct color class', () => {
    const { container } = render(<Status color="green" />);
    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });
});
