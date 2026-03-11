import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getTournament, getRegistrations, addRegistration, getMatches } from '../utils/api';

const statusLabels = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export default function PlayerDashboard() {
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function selectTournament(id) {
    try {
      const [t, regs, m] = await Promise.all([
        getTournament(id),
        getRegistrations(id),
        getMatches(id),
      ]);
      setSelectedTournament(t);
      setRegistrations(regs);
      setMatches(m);
    } catch {
      /* empty */
    }
  }

  async function handleRegister(tournamentId) {
    setRegLoading(true);
    setMessage(null);
    try {
      await addRegistration(tournamentId, { name: user.name, email: user.email });
      setMessage({ type: 'success', text: 'Successfully registered!' });
      await selectTournament(tournamentId);
      loadTournaments();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  }

  const isRegistered = registrations.some(r => r.player_email === user.email);
  const myMatches = matches.filter(m => {
    const myReg = registrations.find(r => r.player_email === user.email);
    if (!myReg) return false;
    return m.player1_id === myReg.player_id || m.player2_id === myReg.player_id;
  });

  const TABS = [
    { id: 'browse', label: 'Tournaments', icon: '🏆' },
    { id: 'my-matches', label: 'My Matches', icon: '🎾' },
  ];

  return (
    <div className="page dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <span className="user-badge">🎾 {user.name}</span>
          <button className="btn-back" onClick={logout}>Logout</button>
        </div>
        <div className="dashboard-header-info">
          <h1 className="dashboard-title">Player Dashboard</h1>
          <div className="dashboard-meta">
            <span className="meta-item">Browse tournaments and register to play</span>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {activeTab === 'browse' && (
          <div className="tab-content" data-testid="tab-browse">
            <h2 className="section-title">Available Tournaments</h2>
            {loading ? (
              <div className="loading">Loading tournaments...</div>
            ) : tournaments.length === 0 ? (
              <div className="empty-state-sm">No tournaments available</div>
            ) : (
              <div className="tournament-grid">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className={`tournament-card clickable ${selectedTournament?.id === t.id ? 'selected' : ''}`}
                    onClick={() => selectTournament(t.id)}
                  >
                    <div className="tournament-card-header">
                      <h3>{t.name}</h3>
                      <span className={`status-badge status-${t.status}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                    <div className="tournament-card-details">
                      {t.date && <span>📅 {new Date(t.date).toLocaleDateString()}</span>}
                      {t.location && <span>📍 {t.location}</span>}
                      <span>👥 Max {t.max_participants}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTournament && (
              <div className="detail-panel" data-testid="tournament-detail">
                <h2 className="section-title">{selectedTournament.name}</h2>
                <div className="detail-info">
                  <div className="detail-row">
                    <span>Status:</span>
                    <span className={`status-badge status-${selectedTournament.status}`}>
                      {statusLabels[selectedTournament.status]}
                    </span>
                  </div>
                  {selectedTournament.date && (
                    <div className="detail-row">
                      <span>Date:</span>
                      <span>📅 {new Date(selectedTournament.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedTournament.location && (
                    <div className="detail-row">
                      <span>Location:</span>
                      <span>📍 {selectedTournament.location}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>Registered:</span>
                    <span>{selectedTournament.stats?.registrations || 0} / {selectedTournament.max_participants}</span>
                  </div>
                </div>

                {message && (
                  <div className={`auth-error ${message.type === 'success' ? 'auth-success' : ''}`}>
                    {message.text}
                  </div>
                )}

                {isRegistered ? (
                  <div className="registered-badge">✅ You are registered for this tournament</div>
                ) : (
                  ['registration_open'].includes(selectedTournament.status) ||
                  selectedTournament.late_registration_open
                ) ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRegister(selectedTournament.id)}
                    disabled={regLoading}
                  >
                    {regLoading ? 'Registering...' : '🎾 Register for Tournament'}
                  </button>
                ) : (
                  <div className="info-badge">Registration is currently closed</div>
                )}

                {myMatches.length > 0 && (
                  <div className="my-matches-section">
                    <h3 className="section-title">Your Matches</h3>
                    <div className="match-cards">
                      {myMatches.map((match) => (
                        <div key={match.id} className={`match-card ${match.status === 'completed' ? 'match-completed' : ''}`}>
                          <div className="match-players">
                            <span className={match.winner_id === match.player1_id ? 'winner' : ''}>
                              {match.player1_name || 'TBD'}
                            </span>
                            <span className="vs">vs</span>
                            <span className={match.winner_id === match.player2_id ? 'winner' : ''}>
                              {match.player2_name || 'TBD'}
                            </span>
                          </div>
                          {match.status === 'completed' && (
                            <div className="match-score">
                              <span className="score">{match.score_player1} - {match.score_player2}</span>
                              {match.winner_name && <span className="winner-label">🏆 {match.winner_name}</span>}
                            </div>
                          )}
                          {match.scheduled_at && (
                            <div className="match-footer">
                              <span className="match-time">🕐 {new Date(match.scheduled_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-matches' && (
          <div className="tab-content" data-testid="tab-my-matches">
            <h2 className="section-title">My Matches (All Tournaments)</h2>
            <p className="info-text">Select a tournament above to see your specific matches.</p>
            {selectedTournament && myMatches.length > 0 ? (
              <div className="match-cards">
                {myMatches.map((match) => (
                  <div key={match.id} className={`match-card ${match.status === 'completed' ? 'match-completed' : ''}`}>
                    <div className="match-players">
                      <span className={match.winner_id === match.player1_id ? 'winner' : ''}>
                        {match.player1_name || 'TBD'}
                      </span>
                      <span className="vs">vs</span>
                      <span className={match.winner_id === match.player2_id ? 'winner' : ''}>
                        {match.player2_name || 'TBD'}
                      </span>
                    </div>
                    {match.status === 'completed' && (
                      <div className="match-score">
                        <span className="score">{match.score_player1} - {match.score_player2}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-sm">No matches found. Register for a tournament first!</div>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav" role="tablist" aria-label="Player navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
