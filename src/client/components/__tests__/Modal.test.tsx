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
