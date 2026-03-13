import React, { useState } from 'react';
import { exportTournament, getExportPdfUrl, getExportExcelUrl } from '../api';

export default function ExportButton({ tournamentId }: { tournamentId: number | string }) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const handleExportJson = async () => {
    setLoading('json');
    setError('');
    try {
      const res = await exportTournament(Number(tournamentId));
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament-${tournamentId}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading('');
    }
  };

  const handleExportPdf = () => {
    window.open(getExportPdfUrl(Number(tournamentId)), '_blank');
  };

  const handleExportExcel = () => {
    window.open(getExportExcelUrl(Number(tournamentId)), '_blank');
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={handleExportJson}
        disabled={loading === 'json'}
        className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
      >
        {loading === 'json' ? '...' : '📥 JSON'}
      </button>
      <button
        onClick={handleExportPdf}
        className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition border border-red-100 shadow-sm"
      >
        📄 PDF
      </button>
      <button
        onClick={handleExportExcel}
        className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition border border-green-100 shadow-sm"
      >
        📊 EXCEL
      </button>
      {error && <span className="text-[10px] text-red-500 font-bold ml-2">⚠️ {error}</span>}
    </div>
  );
}
