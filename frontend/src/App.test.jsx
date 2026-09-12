import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  stateAPI: { getSnapshot: vi.fn() },
  areProductionWritesEnabled: vi.fn(() => false),
  isProductionDataMode: false,
  setProductionWritesEnabled: vi.fn(),
  authAPI: { login: vi.fn(), verify: vi.fn(), logout: vi.fn(), logoutAll: vi.fn(), changePassword: vi.fn() }
}));

vi.mock('./utils/api.js', () => apiMocks);

import App from './App.jsx';

const validToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).replace(/=/g, '')}.signature`;
const snapshot = {
  contests: [], juries: [], teams: [], hall_assignments: [], evaluations: {},
  state: {}, activity_logs: []
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    apiMocks.stateAPI.getSnapshot.mockResolvedValue({ data: snapshot });
  });

  it('initializes without a stored session and renders login', async () => {
    render(<App />);
    expect(await screen.findByText('CCQC 2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('username')).toBeInTheDocument();
  });

  it('logs in, persists the session, and renders the admin dashboard', async () => {
    apiMocks.authAPI.login.mockResolvedValue({
      data: { token: validToken, user: { id: 'admin', username: 'admin', role: 'admin' } }
    });
    render(<App />);
    await screen.findByPlaceholderText('username');
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(screen.getByText('Your command center is ready')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBe(validToken);
    expect(apiMocks.stateAPI.getSnapshot).toHaveBeenCalled();
  });

  it('shows login errors and clears invalid stored sessions', async () => {
    apiMocks.authAPI.login.mockRejectedValue({ response: { data: { error: 'No access' } } });
    const { unmount } = render(<App />);
    await screen.findByPlaceholderText('username');
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('No access')).toBeInTheDocument();

    localStorage.setItem('token', 'stored');
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    apiMocks.authAPI.verify.mockRejectedValue(new Error('expired'));
    unmount();
    render(<App />);
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
    expect(await screen.findByText('Failed to initialize. Please login again.')).toBeInTheDocument();
  });
});
