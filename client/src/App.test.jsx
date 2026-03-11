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
  });
});
