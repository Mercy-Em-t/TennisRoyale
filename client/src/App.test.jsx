import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock the pages to avoid network calls during tests
vi.mock('./pages/TournamentList', () => ({
  default: () => <div data-testid="tournament-list">Tournament List</div>,
}));

vi.mock('./pages/TournamentDetail', () => ({
  default: () => <div data-testid="tournament-detail">Tournament Detail</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('🎾 TennisRoyale')).toBeInTheDocument();
  });

  it('renders tournament list at root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
  });

  it('renders tournament detail at /tournaments/:id', () => {
    render(
      <MemoryRouter initialEntries={['/tournaments/1']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('tournament-detail')).toBeInTheDocument();
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import QuickStats from './components/QuickStats';
import StatusActions from './components/StatusActions';

// Mock fetch for API calls
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  );
  // Clear localStorage
  localStorage.clear();
});

describe('App', () => {
  it('renders the app component', () => {
    render(<App />);
    // App uses AuthProvider + BrowserRouter, should show login when no user
  });

  it('shows login page when not authenticated', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));
    render(<App />);
    // Without a token, should render login page
    expect(await screen.findByText('Tournament Management System')).toBeInTheDocument();
  });
});

describe('QuickStats', () => {
  it('renders all stat cards', () => {
    const stats = { registrations: 12, matches: 8, completedMatches: 5, pools: 4, staff: 3 };
    const tournament = { max_participants: 32 };

    render(<QuickStats stats={stats} tournament={tournament} />);

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('/32')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Registrations')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pools')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });

  it('shows progress bar when there are matches', () => {
    const stats = { registrations: 4, matches: 10, completedMatches: 6, pools: 2, staff: 1 };
    const tournament = { max_participants: 16 };

    render(<QuickStats stats={stats} tournament={tournament} />);

    expect(screen.getByText('Tournament Progress')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '60%' });
  });

  it('hides progress bar when no matches', () => {
    const stats = { registrations: 0, matches: 0, completedMatches: 0, pools: 0, staff: 0 };
    const tournament = { max_participants: 32 };

    render(<QuickStats stats={stats} tournament={tournament} />);

    expect(screen.queryByText('Tournament Progress')).not.toBeInTheDocument();
  });
});

describe('StatusActions', () => {
  it('shows appropriate action for draft tournament', () => {
    const tournament = { status: 'draft' };
    const onStatusChange = vi.fn();
    const onToggleLateReg = vi.fn();
    const onDelete = vi.fn();

    render(<StatusActions tournament={tournament} onStatusChange={onStatusChange} onToggleLateReg={onToggleLateReg} onDelete={onDelete} />);

    expect(screen.getByText('Open Registration')).toBeInTheDocument();
    expect(screen.getByText('Delete Tournament')).toBeInTheDocument();
  });

  it('shows appropriate action for in-progress tournament', () => {
    const tournament = { status: 'in_progress', late_registration_open: 0 };
    const onStatusChange = vi.fn();
    const onToggleLateReg = vi.fn();
    const onDelete = vi.fn();

    render(<StatusActions tournament={tournament} onStatusChange={onStatusChange} onToggleLateReg={onToggleLateReg} onDelete={onDelete} />);

    expect(screen.getByText('Complete Tournament')).toBeInTheDocument();
    expect(screen.getByText('Open Late Reg')).toBeInTheDocument();
  });

  it('calls onStatusChange when action is clicked', async () => {
    const tournament = { status: 'draft' };
    const onStatusChange = vi.fn();
    const onToggleLateReg = vi.fn();
    const onDelete = vi.fn();
    const { getByText } = render(
      <StatusActions tournament={tournament} onStatusChange={onStatusChange} onToggleLateReg={onToggleLateReg} onDelete={onDelete} />
    );

    getByText('Open Registration').click();
    expect(onStatusChange).toHaveBeenCalledWith('registration_open');
  });

  it('calls onToggleLateReg when late reg button is clicked', async () => {
    const tournament = { status: 'in_progress', late_registration_open: 0 };
    const onStatusChange = vi.fn();
    const onToggleLateReg = vi.fn();
    const onDelete = vi.fn();
    const { getByText } = render(
      <StatusActions tournament={tournament} onStatusChange={onStatusChange} onToggleLateReg={onToggleLateReg} onDelete={onDelete} />
    );

    getByText('Open Late Reg').click();
    expect(onToggleLateReg).toHaveBeenCalled();
  });
});
