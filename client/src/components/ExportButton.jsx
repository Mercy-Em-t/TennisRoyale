import { useState } from 'react';
import { exportTournament, getExportPdfUrl, getExportExcelUrl } from '../utils/api';

export default function ExportButton({ tournamentId }) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const handleExportJson = async () => {
    setLoading('json');
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
      setLoading('');
    }
  };

  const handleExportPdf = () => {
    window.open(getExportPdfUrl(tournamentId), '_blank');
  };

  const handleExportExcel = () => {
    window.open(getExportExcelUrl(tournamentId), '_blank');
  };

  return (
    <span className="export-button">
      <button onClick={handleExportJson} disabled={loading === 'json'}>
        {loading === 'json' ? '…' : '📥 JSON'}
      </button>
      <button onClick={handleExportPdf} className="btn-pdf">
        📄 PDF
      </button>
      <button onClick={handleExportExcel} className="btn-excel">
        📊 Excel
      </button>
      {error && <span className="error small">{error}</span>}
    </span>
  );
}
