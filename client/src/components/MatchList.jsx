import { useState, useEffect } from 'react';
import { getMatches, scheduleMatch, scoreMatch } from '../utils/api';

export default function MatchList({ tournamentId, status }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatches = async () => {
    try {
      const data = await getMatches(tournamentId);
      setMatches(Array.isArray(data) ? data : data.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, [tournamentId]);

  if (loading) return <p>Loading matches…</p>;

  // Group matches by round/stage
  const grouped = {};
  matches.forEach((m) => {
    const stage = m.bracket_stage || m.bracketStage || m.stage || m.round || 'Pool Play';
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(m);
  });

  return (
    <div className="match-list">
      <h3>Matches</h3>
      {error && <p className="error">{error}</p>}
      {matches.length === 0 ? (
        <p className="empty">No matches generated yet.</p>
      ) : (
        Object.entries(grouped).map(([stage, stageMatches]) => (
          <div key={stage} className="match-stage">
            <h4>{stage}</h4>
            <div className="match-cards">
              {stageMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  editable={status === 'in_progress'}
                  onUpdated={fetchMatches}
                />
              ))}
            </div>
          </div>
        ))
      )}
      <button className="refresh-btn" onClick={fetchMatches}>Refresh Matches</button>
    </div>
  );
}

function MatchCard({ match, editable, onUpdated }) {
  const [scheduling, setScheduling] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [error, setError] = useState('');

  const player1Name = match.player1_name || match.Player1?.playerName || match.player1Name || `Player ${match.player1_id || match.player1Id || '?'}`;
  const player2Name = match.player2_name || match.Player2?.playerName || match.player2Name || `Player ${match.player2_id || match.player2Id || '?'}`;

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    setError('');
    try {
      await scheduleMatch(match.id, scheduledAt);
      setScheduling(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScore = async () => {
    setError('');
    try {
      await scoreMatch(match.id, Number(score1), Number(score2));
      setScoring(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`match-card ${(match.winner_id || match.winnerId) ? 'completed' : ''}`}>
      <div className="match-players">
        <span className={(match.winner_id || match.winnerId) === (match.player1_id || match.player1Id) ? 'winner' : ''}>
          {player1Name}
        </span>
        <span className="vs">vs</span>
        <span className={(match.winner_id || match.winnerId) === (match.player2_id || match.player2Id) ? 'winner' : ''}>
          {player2Name}
        </span>
      </div>

      {((match.score_player1 ?? match.scorePlayer1) != null || (match.score_player2 ?? match.scorePlayer2) != null) && (
        <div className="match-score">
          {match.score_player1 ?? match.scorePlayer1} – {match.score_player2 ?? match.scorePlayer2}
        </div>
      )}

      {(match.scheduled_at || match.scheduledAt) && (
        <div className="match-schedule">
          📅 {new Date(match.scheduled_at || match.scheduledAt).toLocaleString()}
        </div>
      )}

      {error && <p className="error small">{error}</p>}

      {editable && (
        <div className="match-actions">
          {!scheduling && !scoring && (
            <>
              <button onClick={() => setScheduling(true)} className="btn-small">Schedule</button>
              <button onClick={() => setScoring(true)} className="btn-small">Score</button>
            </>
          )}

          {scheduling && (
            <div className="inline-form">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <button onClick={handleSchedule} className="btn-small">Save</button>
              <button onClick={() => setScheduling(false)} className="btn-small btn-cancel">Cancel</button>
            </div>
          )}

          {scoring && (
            <div className="inline-form">
              <input
                type="number"
                placeholder="P1"
                min="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="score-input"
              />
              <span>–</span>
              <input
                type="number"
                placeholder="P2"
                min="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="score-input"
              />
              <button onClick={handleScore} className="btn-small">Save</button>
              <button onClick={() => setScoring(false)} className="btn-small btn-cancel">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
