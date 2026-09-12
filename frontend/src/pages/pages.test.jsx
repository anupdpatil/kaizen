import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  authAPI: { logout: vi.fn(), logoutAll: vi.fn(), changePassword: vi.fn() },
  contestsAPI: {
    create: vi.fn(), update: vi.fn(), delete: vi.fn(), publish: vi.fn(),
    unpublish: vi.fn(), setScoreUpdates: vi.fn(), complete: vi.fn()
  },
  stateAPI: { setActiveContest: vi.fn() },
  juriesAPI: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  teamsAPI: { create: vi.fn(), delete: vi.fn(), bulkCreate: vi.fn() },
  assignmentsAPI: { create: vi.fn(), delete: vi.fn() },
  evaluationsAPI: { submit: vi.fn() },
  areProductionWritesEnabled: vi.fn(() => false),
  isProductionDataMode: false,
  setProductionWritesEnabled: vi.fn()
}));

vi.mock('../utils/api.js', () => apiMocks);

import LoginPage from './LoginPage.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import JuryDashboard from './JuryDashboard.jsx';
import ActivityPage from './admin/ActivityPage.jsx';
import DashboardPage from './admin/DashboardPage.jsx';
import ContestPage from './admin/ContestPage.jsx';
import JuriesPage from './admin/JuriesPage.jsx';
import TeamsPage from './admin/TeamsPage.jsx';
import AssignmentsPage from './admin/AssignmentsPage.jsx';
import ResultsPage from './admin/ResultsPage.jsx';
import RankingsPage from './admin/RankingsPage.jsx';
import DetailedScoresPage from './admin/DetailedScoresPage.jsx';
import ExportsPage from './admin/ExportsPage.jsx';

const emptyState = {
  contests: [], juries: [], teams: [], hall_assignments: [], evaluations: {},
  state: {}, activity_logs: []
};

const stateWithContest = {
  ...emptyState,
  contests: [{ id: 'c1', name: 'Contest One', code: 'C1', days: 2, hallCount: 2, published: true, hallNames: { 1: 'Main Hall' } }],
  juries: [{ id: 'j1', name: 'Jury One', username: 'jury1' }, { id: 'j2', name: 'Jury Two', username: 'jury2' }],
  teams: [
    { id: 't1', teamCode: 'T1', teamName: 'Team One', organisationName: 'Org', category: 'Quality Circle', contestId: 'c1', assignedDay: 1, hallId: 1 }
  ],
  evaluations: {
    t1: {
      j1: { total: 80, scores: {} },
      j2: { total: 90, scores: {} }
    }
  },
  hall_assignments: [{ id: 'a1', contestId: 'c1', day: 1, hallId: 1, juryIds: ['j1', 'j2'] }],
  state: { activeContestId: 'c1' },
  activity_logs: [{ id: 'a', action: 'login', actor: 'Admin', createdAt: '2025-01-01T00:00:00Z' }]
};

describe('LoginPage', () => {
  it('submits credentials and switches roles', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jury' }));
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'j1' } });
    fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form'));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('j1', 'secret', 'jury'));
  });

  it('displays authentication errors', () => {
    render(<LoginPage onLogin={vi.fn()} error="Invalid credentials" />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

describe('admin pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dashboard empty and populated states with navigation callbacks', () => {
    const onViewChange = vi.fn();
    const onHallSelect = vi.fn();
    const { rerender } = render(<DashboardPage appState={emptyState} onViewChange={onViewChange} onHallSelect={onHallSelect} />);
    expect(screen.getByText('Your command center is ready')).toBeInTheDocument();
    rerender(<DashboardPage appState={stateWithContest} onViewChange={onViewChange} onHallSelect={onHallSelect} />);
    expect(screen.getByText('Contest One')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Registered teams/ }));
    expect(onViewChange).toHaveBeenCalledWith('teams');
    fireEvent.click(screen.getByRole('button', { name: /Main Hall/ }));
    expect(onHallSelect).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('tab', { name: 'Day-by-day progress' }));
    expect(screen.getByText('Evaluation runway')).toBeInTheDocument();
  });

  it('renders activity empty and populated logs', () => {
    const { rerender } = render(<ActivityPage appState={emptyState} />);
    expect(screen.getByText('No activity has been recorded yet.')).toBeInTheDocument();
    rerender(<ActivityPage appState={stateWithContest} />);
    expect(screen.getByText(/signed in/)).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders the admin dashboard and changes views', () => {
    render(<AdminDashboard user={{ username: 'admin', role: 'admin' }} appState={stateWithContest}
      updateState={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('CCQC 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Rankings/ }));
    expect(screen.getByRole('heading', { name: 'Rankings' })).toBeInTheDocument();
  });

  it('creates a contest and handles the setup form', async () => {
    const updateState = vi.fn();
    apiMocks.contestsAPI.create.mockResolvedValue({ data: { id: 'new', name: 'New Contest' } });
    render(<ContestPage appState={emptyState} updateState={updateState} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Contest/ }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Kaizen 2026'), { target: { value: 'New Contest' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., KC2026'), { target: { value: 'NEW' } });
    const contestNumbers = screen.getAllByRole('spinbutton');
    fireEvent.change(contestNumbers[0], { target: { value: '1' } });
    fireEvent.change(contestNumbers[1], { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Contest/ }));
    await waitFor(() => expect(apiMocks.contestsAPI.create).toHaveBeenCalled());
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ contests: expect.any(Array) }));
  });

  it('creates juries and teams through their validation forms', async () => {
    const updateState = vi.fn();
    apiMocks.juriesAPI.create.mockResolvedValue({ data: { id: 'j2', name: 'New Jury' } });
    const { container, rerender } = render(<JuriesPage appState={stateWithContest} updateState={updateState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Jury' }));
    const juryInputs = screen.getAllByRole('textbox');
    fireEvent.change(juryInputs[0], { target: { value: 'New Jury' } });
    fireEvent.change(juryInputs[1], { target: { value: 'newjury' } });
    fireEvent.change(container.querySelectorAll('input')[2], { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Jury' }));
    await waitFor(() => expect(apiMocks.juriesAPI.create).toHaveBeenCalled());

    rerender(<TeamsPage appState={stateWithContest} updateState={updateState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Team' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Add Team' }).closest('form'));
    expect(screen.getAllByText('Please select a contest').length).toBeGreaterThan(0);
  });

  it('validates assignments and displays reporting tables', () => {
    const updateState = vi.fn();
    const { rerender } = render(<AssignmentsPage appState={stateWithContest} updateState={updateState} />);
    expect(screen.getByText('Hall-Jury Assignment')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Assign Juries' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Assign' }).closest('form'));
    expect(screen.getAllByText('Please fill all fields').length).toBeGreaterThan(0);
    rerender(<ResultsPage appState={stateWithContest} initialHallFilter="1" />);
    expect(screen.getByText('Team One')).toBeInTheDocument();
    rerender(<RankingsPage appState={stateWithContest} />);
    expect(screen.getByText('Team One')).toBeInTheDocument();
    rerender(<DetailedScoresPage appState={stateWithContest} />);
    expect(screen.getByText(/Detailed Jury Scores/)).toBeInTheDocument();
  });

  it('exports CSV files and exposes all export actions', () => {
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const anchor = createElement(tag);
        anchor.click = click;
        return anchor;
      }
      return createElement(tag);
    });
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
    render(<ExportsPage appState={stateWithContest} />);
    expect(screen.getAllByRole('button', { name: 'Download CSV' })).toHaveLength(4);
    screen.getAllByRole('button', { name: 'Download CSV' }).forEach((button) => fireEvent.click(button));
    expect(click).toHaveBeenCalledTimes(4);
    vi.restoreAllMocks();
  });
});

describe('JuryDashboard', () => {
  it('forces a password change when requested', () => {
    const onLogout = vi.fn();
    render(<JuryDashboard user={{ id: 'j1', username: 'jury' }} appState={emptyState}
      updateState={vi.fn()} onLogout={onLogout} forcePasswordChange />);
    expect(screen.getByText(/must change your default password/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('shows assigned pending teams and validates score input', () => {
    const state = {
      ...stateWithContest,
      evaluations: { t1: {} }
    };
    render(<JuryDashboard user={{ id: 'j1', username: 'jury' }} appState={state}
      updateState={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Team One')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Team One'));
    expect(screen.getAllByText(/score/i).length).toBeGreaterThan(0);
  });
});
