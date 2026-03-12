import { useState } from 'react';
import { advanceBracket } from '../utils/api';

const BRACKET_STAGES = [
  'quarterfinal',
  'semifinal',
  'final',
];

export default function BracketView({ tournamentId, status }) {
  const [selectedStage, setSelectedStage] = useState(BRACKET_STAGES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdvance = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await advanceBracket(tournamentId, selectedStage);
      setMessage(`Advanced to ${selectedStage.replace(/_/g, ' ')} successfully!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = status === 'in_progress';

  return (
    <div className="bracket-view">
      <h3>Bracket Advancement</h3>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {canAdvance && (
        <div className="bracket-controls">
          <label htmlFor="bracket-stage">Advance to stage:</label>
          <select
            id="bracket-stage"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            {BRACKET_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button onClick={handleAdvance} disabled={loading}>
            {loading ? 'Advancing…' : 'Advance Bracket'}
          </button>
        </div>
      )}

      <div className="bracket-stages">
        {BRACKET_STAGES.map((stage, i) => (
          <div key={stage} className="bracket-stage-item">
            <div className={`stage-dot ${i === 0 ? 'active' : ''}`} />
            <span>{stage.replace(/_/g, ' ')}</span>
            {i < BRACKET_STAGES.length - 1 && <div className="stage-connector" />}
          </div>
        ))}
      </div>
    </div>
  );
}
