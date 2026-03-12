import React, { useState, useEffect } from 'react';
import { getMatches, createMatch, updateMatch, deleteMatch, getRegistrations } from '../utils/api';

const stageLabels = {
  pool: 'Pool Stage',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'Final',
};

export default function MatchManager({ tournamentId, onUpdate }) {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player1_id: '', player2_id: '', bracket_stage: 'pool', scheduled_at: '' });
  const [scoreForm, setScoreForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  async function loadData() {
    try {
      const [matchData, regData] = await Promise.all([
        getMatches(tournamentId),
        getRegistrations(tournamentId),
      ]);
      setMatches(matchData);
      setPlayers(regData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMatch(e) {
    e.preventDefault();
    if (!form.player1_id || !form.player2_id) return;
    try {
      await createMatch(tournamentId, form);
      setForm({ player1_id: '', player2_id: '', bracket_stage: 'pool', scheduled_at: '' });
      setShowForm(false);
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleScore(matchId) {
    const scores = scoreForm[matchId];
    if (!scores || scores.score_player1 == null || scores.score_player2 == null) return;
    try {
      await updateMatch(tournamentId, matchId, {
        score_player1: parseInt(scores.score_player1),
        score_player2: parseInt(scores.score_player2),
      });
      setScoreForm({ ...scoreForm, [matchId]: {} });
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleDeleteMatch(matchId) {
    if (!window.confirm('Delete this match?')) return;
    try {
      await deleteMatch(tournamentId, matchId);
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  // Group matches by stage
  const grouped = matches.reduce((acc, m) => {
    const stage = m.bracket_stage || 'pool';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(m);
    return acc;
  }, {});

  return (
    <div className="match-manager" data-testid="match-manager">
      <div className="section-header">
        <h2 className="section-title">Match Schedule</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Match'}
        </button>
      </div>

      {showForm && (
        <form className="match-form" onSubmit={handleCreateMatch} data-testid="match-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="player1">Player 1</label>
              <select
                id="player1"
                value={form.player1_id}
                onChange={(e) => setForm({ ...form, player1_id: e.target.value })}
                required
              >
                <option value="">Select player</option>
                {players.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{p.player_name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="player2">Player 2</label>
              <select
                id="player2"
                value={form.player2_id}
                onChange={(e) => setForm({ ...form, player2_id: e.target.value })}
                required
              >
                <option value="">Select player</option>
                {players.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{p.player_name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                value={form.bracket_stage}
                onChange={(e) => setForm({ ...form, bracket_stage: e.target.value })}
              >
                <option value="pool">Pool</option>
                <option value="quarterfinal">Quarterfinal</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="scheduled">Schedule</label>
              <input
                id="scheduled"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Create Match</button>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading matches...</div>
      ) : matches.length === 0 ? (
        <div className="empty-state-sm">No matches scheduled yet</div>
      ) : (
        Object.entries(grouped).map(([stage, stageMatches]) => (
          <div key={stage} className="match-stage">
            <h3 className="stage-title">{stageLabels[stage] || stage}</h3>
            <div className="match-cards">
              {stageMatches.map((match) => (
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

                  {match.status === 'completed' ? (
                    <div className="match-score">
                      <span className="score">{match.score_player1} - {match.score_player2}</span>
                      {match.winner_name && <span className="winner-label">🏆 {match.winner_name}</span>}
                    </div>
                  ) : (
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
                        Save
                      </button>
                    </div>
                  )}

                  <div className="match-footer">
                    {match.scheduled_at && (
                      <span className="match-time">🕐 {new Date(match.scheduled_at).toLocaleString()}</span>
                    )}
                    <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteMatch(match.id)} aria-label="Delete match">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
