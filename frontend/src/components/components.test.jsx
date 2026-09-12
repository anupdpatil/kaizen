import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  authAPI: { changePassword: vi.fn(), logoutAll: vi.fn() },
  stateAPI: {},
  teamsAPI: { bulkCreate: vi.fn() },
  areProductionWritesEnabled: vi.fn(() => false),
  isProductionDataMode: false,
  setProductionWritesEnabled: vi.fn()
}));

vi.mock('../utils/api.js', () => apiMocks);
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() }
}));

import ToastContainer from './ToastContainer.jsx';
import PasswordChangeModal from './PasswordChangeModal.jsx';
import AdminLayout from './AdminLayout.jsx';
import TeamImportModal from './TeamImportModal.jsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toast events and removes them after their duration', () => {
    render(<ToastContainer />);
    fireEvent(window, new CustomEvent('kaizen:toast', {
      detail: { message: 'Saved', type: 'info', duration: 1000 }
    }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toHaveStyle({ background: '#1a73e8' });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('cleans up its event listener on unmount', () => {
    const { unmount } = render(<ToastContainer />);
    unmount();
    fireEvent(window, new CustomEvent('kaizen:toast', { detail: { message: 'Gone' } }));
    expect(screen.queryByText('Gone')).not.toBeInTheDocument();
  });
});

describe('PasswordChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed and validates fields', async () => {
    const { rerender } = render(<PasswordChangeModal isOpen={false} />);
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
    rerender(<PasswordChangeModal isOpen user={{ username: 'jury' }} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Update Password' }).closest('form'));
    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
  });

  it('validates password length and confirmation', async () => {
    render(<PasswordChangeModal isOpen user={{ username: 'jury' }} />);
    fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'old' } });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByText('New password must be at least 6 characters long.')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'long-enough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByText('New passwords do not match.')).toBeInTheDocument();
  });

  it('submits successfully and invokes the success callback', async () => {
    vi.useFakeTimers();
    apiMocks.authAPI.changePassword.mockResolvedValue({ data: {} });
    const onSuccess = vi.fn();
    render(<PasswordChangeModal isOpen user={{ username: 'jury' }} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'old' } });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiMocks.authAPI.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old', newPassword: 'new-password', confirmPassword: 'new-password'
    });
    expect(screen.getByText('Password updated successfully.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(onSuccess).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('shows API errors and supports closing', async () => {
    apiMocks.authAPI.changePassword.mockRejectedValue({ response: { data: { error: 'Bad password' } } });
    const onClose = vi.fn();
    render(<PasswordChangeModal isOpen user={{ username: 'jury' }} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'old' } });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByText('Bad password')).toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
  });

  it('renders navigation, children, sync errors, and opens password modal', () => {
    const onViewChange = vi.fn();
    render(
      <AdminLayout user={{ username: 'admin', role: 'admin' }} currentView="dashboard"
        onViewChange={onViewChange} onLogout={vi.fn()} syncError="Offline">
        <div>Child content</div>
      </AdminLayout>
    );
    expect(screen.getByText('CCQC 2026')).toBeInTheDocument();
    expect(screen.getByText('Sync Error:')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Contest/ }));
    expect(onViewChange).toHaveBeenCalledWith('setup');
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    expect(screen.getByText('Signed in as admin')).toBeInTheDocument();
  });

  it('logs out all sessions after confirmation and reports failures', async () => {
    const onLogout = vi.fn();
    apiMocks.authAPI.logoutAll.mockResolvedValue({});
    render(<AdminLayout user={{ username: 'admin', role: 'admin' }} onViewChange={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out All' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    apiMocks.authAPI.logoutAll.mockRejectedValue({ response: { data: { error: 'Nope' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out All' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Nope'));
  });
});

describe('TeamImportModal', () => {
  it('renders an empty import form and supports cancel', () => {
    const onClose = vi.fn();
    render(<TeamImportModal onClose={onClose} />);
    expect(screen.getByText('Import Teams')).toBeInTheDocument();
    expect(screen.getByText(/Upload the Registration List/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
