import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GitOperations from '../GitOperations';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

describe('GitOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input fields for cloning', () => {
    render(<GitOperations onResult={() => {}} />);
    expect(screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name')).toBeInTheDocument();
    expect(screen.getByText('Clone')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
  });

  it('renders select button', () => {
    render(<GitOperations onResult={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('calls fetch when Clone is clicked', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, dir: 'repos/test' }),
    });
    const updateStatus = vi.fn();
    render(<GitOperations updateStatus={updateStatus} />);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const cloneButton = screen.getByText('Clone');
    
    fireEvent.change(input, { target: { value: 'https://github.com/test/test.git' } });
    await act(async () => {
      fireEvent.click(cloneButton);
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/clone', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ url: 'https://github.com/test/test.git' }),
    }));
    expect(updateStatus).toHaveBeenCalledWith('Ready', 'green');
  });

  it('calls fetch when Open is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dir: 'repos/test' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ commits: [] }),
    });
    
    render(<GitOperations />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const openButton = screen.getByText('Open');
    
    fireEvent.change(input, { target: { value: 'repos/test' } });
    await act(async () => {
      fireEvent.click(openButton);
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/open', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ dir: 'repos/test' }),
    }));
  });

  it('calls fetch when Log is clicked', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ commits: [] }),
    });
    
    render(<GitOperations />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const logButton = screen.getByText('Log');
    
    fireEvent.change(input, { target: { value: 'repos/test' } });
    await act(async () => {
      fireEvent.click(logButton);
    });
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/log?'));
  });

  it('handles limit change', async () => {
    render(<GitOperations />);
    const limitInput = screen.getByLabelText('Commits to fetch') as HTMLInputElement;
    fireEvent.change(limitInput, { target: { value: '50' } });
    expect(limitInput.value).toBe('50');
  });

  it('handles Open failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Open failed' }),
    });
    const updateStatus = vi.fn();
    render(<GitOperations updateStatus={updateStatus} />);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const openButton = screen.getByText('Open');
    
    fireEvent.change(input, { target: { value: 'invalid-path' } });
    await act(async () => {
      fireEvent.click(openButton);
    });
    
    expect(updateStatus).toHaveBeenCalledWith('Open failed', 'red');
  });

  it('handles Log failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Log failed' }),
    });
    const updateStatus = vi.fn();
    render(<GitOperations updateStatus={updateStatus} />);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const logButton = screen.getByText('Log');
    
    fireEvent.change(input, { target: { value: 'repos/test' } });
    await act(async () => {
      fireEvent.click(logButton);
    });
    
    expect(updateStatus).toHaveBeenCalledWith('Log failed', 'red');
  });

  it('automatically triggers log after successful open', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ commits: [] }),
    });
    render(<GitOperations />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    fireEvent.change(input, { target: { value: 'repos/test' } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Open'));
    });
    
    // Check it called open AND then log
    expect(global.fetch).toHaveBeenCalledWith('/api/open', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/log?'));
  });

  it('handles Clone failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Clone failed' }),
    });
    const updateStatus = vi.fn();
    render(<GitOperations updateStatus={updateStatus} />);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    const cloneButton = screen.getByText('Clone');
    
    fireEvent.change(input, { target: { value: 'invalid-url' } });
    await act(async () => {
      fireEvent.click(cloneButton);
    });
    
    expect(updateStatus).toHaveBeenCalledWith('Clone failed', 'red');
  });

  it('fetches and selects a local repo', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ repos: ['repo1', 'repo2'] }),
    });
    
    render(<GitOperations />);
    const selectButton = screen.getByText('Select...');
    
    await act(async () => {
      fireEvent.click(selectButton);
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/repos');
    expect(await screen.findByText('repo1')).toBeInTheDocument();
    
    const repoButton = screen.getByText('repo1');
    fireEvent.click(repoButton);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name') as HTMLInputElement;
    expect(input.value).toBe('repos/repo1');
  });

  it('handles limit change with invalid values', async () => {
    render(<GitOperations />);
    const limitInput = screen.getByLabelText('Commits to fetch') as HTMLInputElement;
    fireEvent.change(limitInput, { target: { value: '' } });
    expect(limitInput.value).toBe('1'); // Number('') is 0, clamped to 1
    fireEvent.change(limitInput, { target: { value: '2000' } });
    expect(limitInput.value).toBe('1000'); // clamped to max
    fireEvent.change(limitInput, { target: { value: '-5' } });
    expect(limitInput.value).toBe('1'); // clamped to min
  });

  it('respects disabled prop', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<GitOperations disabled={true} />);
    const cloneButton = screen.getByText('Clone');
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    
    fireEvent.change(input, { target: { value: 'https://github.com/test/test.git' } });
    await act(async () => {
      fireEvent.click(cloneButton);
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls onResult when operation succeeds', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, dir: 'repos/test' }),
    });
    const onResult = vi.fn();
    render(<GitOperations onResult={onResult} />);
    
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    fireEvent.change(input, { target: { value: 'https://github.com/test/test.git' } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Clone'));
    });
    
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      op: 'clone',
      status: 'success'
    }));
  });

  it('calls fetch when Open is clicked with a URL', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<GitOperations />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    fireEvent.change(input, { target: { value: 'https://github.com/test/test.git' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Open'));
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/open', expect.objectContaining({
      body: JSON.stringify({ url: 'https://github.com/test/test.git' }),
    }));
  });

  it('calls fetch when Log is clicked with a URL', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<GitOperations />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    fireEvent.change(input, { target: { value: 'https://github.com/test/test.git' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Log'));
    });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/log?url='));
  });

  it('handles generic error in handlers', async () => {
    (global.fetch as any).mockRejectedValue('Generic Error');
    const updateStatus = vi.fn();
    render(<GitOperations updateStatus={updateStatus} />);
    const input = screen.getByPlaceholderText('https://github.com/user/repo.git or repos/name');
    fireEvent.change(input, { target: { value: 'repos/test' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Clone'));
    });
    expect(updateStatus).toHaveBeenCalledWith('Clone failed', 'red');
  });
});
