import { useState } from 'react';
import { exportTournament } from '../utils/api';

export default function ExportButton({ tournamentId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await exportTournament(tournamentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament-${tournamentId}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="export-button">
      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting…' : '📥 Export'}
      </button>
      {error && <span className="error small">{error}</span>}
    </span>
  );
}
