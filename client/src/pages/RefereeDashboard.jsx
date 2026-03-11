import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getTournament, getMatches, updateMatch } from '../utils/api';

const statusLabels = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export default function RefereeDashboard() {
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [scoreForm, setScoreForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const data = await getTournaments();
      setTournaments(data.filter(t => ['in_progress', 'registration_closed'].includes(t.status)));
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function selectTournament(id) {
    try {
      const [t, m] = await Promise.all([getTournament(id), getMatches(id)]);
      setSelectedTournament(t);
      setMatches(m);
    } catch {
      /* empty */
    }
  }

  async function handleScore(matchId) {
    const scores = scoreForm[matchId];
    if (!scores || scores.score_player1 == null || scores.score_player2 == null) return;
    try {
      await updateMatch(selectedTournament.id, matchId, {
        score_player1: parseInt(scores.score_player1),
        score_player2: parseInt(scores.score_player2),
      });
      setScoreForm({ ...scoreForm, [matchId]: {} });
      selectTournament(selectedTournament.id);
    } catch {
      /* empty */
    }
  }

  const pendingMatches = matches.filter(m => m.status !== 'completed');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="page dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <span className="user-badge">📋 {user.name}</span>
          <button className="btn-back" onClick={logout}>Logout</button>
        </div>
        <div className="dashboard-header-info">
          <h1 className="dashboard-title">Referee Dashboard</h1>
          <div className="dashboard-meta">
            <span className="meta-item">Score and officiate tournament matches</span>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="tab-content">
          <h2 className="section-title">Active Tournaments</h2>
          {loading ? (
            <div className="loading">Loading tournaments...</div>
          ) : tournaments.length === 0 ? (
            <div className="empty-state-sm">No active tournaments</div>
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTournament && (
            <div className="detail-panel" data-testid="referee-matches">
              <h2 className="section-title">{selectedTournament.name} – Matches</h2>

              {pendingMatches.length > 0 && (
                <div className="match-section">
                  <h3 className="subsection-title">⏳ Pending ({pendingMatches.length})</h3>
                  <div className="match-cards">
                    {pendingMatches.map((match) => (
                      <div key={match.id} className="match-card referee-match">
                        <div className="match-players">
                          <span>{match.player1_name || 'TBD'}</span>
                          <span className="vs">vs</span>
                          <span>{match.player2_name || 'TBD'}</span>
                        </div>
                        <div className="score-input">
                          <input
                            type="number"
                            min="0"
                            placeholder="P1"
                            className="score-field"
                            value={scoreForm[match.id]?.score_player1 ?? ''}
                            onChange={(e) => setScoreForm({
                              ...scoreForm,
                              [match.id]: { ...scoreForm[match.id], score_player1: e.target.value }
                            })}
                            aria-label="Player 1 score"
                          />
                          <span className="score-dash">-</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="P2"
                            className="score-field"
                            value={scoreForm[match.id]?.score_player2 ?? ''}
                            onChange={(e) => setScoreForm({
                              ...scoreForm,
                              [match.id]: { ...scoreForm[match.id], score_player2: e.target.value }
                            })}
                            aria-label="Player 2 score"
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => handleScore(match.id)}>
                            Submit Score
                          </button>
                        </div>
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

              {completedMatches.length > 0 && (
                <div className="match-section">
                  <h3 className="subsection-title">✅ Completed ({completedMatches.length})</h3>
                  <div className="match-cards">
                    {completedMatches.map((match) => (
                      <div key={match.id} className="match-card match-completed">
                        <div className="match-players">
                          <span className={match.winner_id === match.player1_id ? 'winner' : ''}>
                            {match.player1_name || 'TBD'}
                          </span>
                          <span className="vs">vs</span>
                          <span className={match.winner_id === match.player2_id ? 'winner' : ''}>
                            {match.player2_name || 'TBD'}
                          </span>
                        </div>
                        <div className="match-score">
                          <span className="score">{match.score_player1} - {match.score_player2}</span>
                          {match.winner_name && <span className="winner-label">🏆 {match.winner_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 && (
                <div className="empty-state-sm">No matches scheduled for this tournament yet</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
