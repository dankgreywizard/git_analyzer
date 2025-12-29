import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from '../Modal';
import React from 'react';

describe('Modal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <Modal open={false} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when open is true', () => {
    render(
      <Modal open={true} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} title="Test Modal" onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when background is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal open={true} title="Test Modal" onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );
    fireEvent.click(container.firstChild!);
    expect(handleClose).toHaveBeenCalled();
  });
});
