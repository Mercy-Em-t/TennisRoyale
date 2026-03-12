import React, { useEffect, useState, useCallback } from 'react';
import { getBracket, generateBracket, advanceBracket } from '../api';
import { BracketMatch, Tournament } from '../types';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

export default function BracketPage({ tournamentId, tournament }: Props) {
  const [rounds, setRounds] = useState<Record<number, BracketMatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [advanceModal, setAdvanceModal] = useState<BracketMatch | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getBracket(tournamentId);
      setRounds(res.data.rounds || {});
    } catch {
      setError('Failed to load bracket');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateBracket(tournamentId);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to generate bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvance = async (winnerId: number) => {
    if (!advanceModal) return;
    try {
      await advanceBracket(tournamentId, advanceModal.match_id, winnerId);
      await load();
      setAdvanceModal(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to advance bracket');
    }
  };

  // Bracket rounds already grouped from API
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const maxRound = Math.max(...roundNumbers, 0);
  const bracketEmpty = roundNumbers.length === 0;

  const getRoundLabel = (round: number) => {
    if (round === maxRound) return 'Final';
    if (round === maxRound - 1) return 'Semi-Final';
    if (round === maxRound - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Tournament Bracket</h2>
        {tournament.status === 'in_progress' && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {generating ? 'Generating...' : 'Generate Bracket'}
          </button>
        )}
      </div>

      {bracketEmpty ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border">
          {tournament.status === 'in_progress' ? (
            <div>
              <p className="text-lg">No bracket generated yet</p>
              <p className="text-sm mt-1">Click "Generate Bracket" to create the tournament bracket</p>
            </div>
          ) : (
            <p className="text-lg">Bracket will be available when tournament is in progress</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6 overflow-x-auto">
          <div className="flex gap-8 min-w-max">
            {roundNumbers.map((round) => (
              <div key={round} className="flex flex-col gap-4" style={{ minWidth: '200px' }}>
                <h3 className="text-sm font-semibold text-gray-500 text-center pb-2 border-b">
                  {getRoundLabel(round)}
                </h3>
                <div className="flex flex-col gap-4">
                  {rounds[round].map((bm) => {
                    const match = bm.match;
                    const isCompleted = match.status === 'completed';
                    const canAdvance = isCompleted && !match.winner_id && tournament.status === 'in_progress';
                    const winner = match.winner_id;

                    return (
                      <div
                        key={bm.id}
                        className="border rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className={`px-4 py-2 flex items-center justify-between ${winner === match.player1_id ? 'bg-green-50' : 'bg-white'} border-b`}>
                          <span className={`text-sm font-medium ${winner === match.player1_id ? 'text-green-700' : 'text-gray-700'}`}>
                            {match.player1_name || (match.player1_id ? `Player ${match.player1_id}` : 'TBD')}
                            {winner === match.player1_id && ' 🏆'}
                          </span>
                          <span className="text-sm text-gray-500 font-mono">{match.score_player1 || '—'}</span>
                        </div>
                        <div className={`px-4 py-2 flex items-center justify-between ${winner === match.player2_id ? 'bg-green-50' : 'bg-white'}`}>
                          <span className={`text-sm font-medium ${winner === match.player2_id ? 'text-green-700' : 'text-gray-700'}`}>
                            {match.player2_name || (match.player2_id ? `Player ${match.player2_id}` : 'TBD')}
                            {winner === match.player2_id && ' 🏆'}
                          </span>
                          <span className="text-sm text-gray-500 font-mono">{match.score_player2 || '—'}</span>
                        </div>
                        {(isCompleted || canAdvance) && tournament.status === 'in_progress' && (
                          <div className="px-3 py-2 bg-gray-50 border-t">
                            <button
                              onClick={() => setAdvanceModal(bm)}
                              className="w-full text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition"
                            >
                              Advance Winner
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {advanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Advance Winner</h3>
            <p className="text-sm text-gray-600 mb-4">Select the winner to advance to the next round:</p>
            <div className="space-y-2">
              {advanceModal.match.player1_id && (
                <button
                  onClick={() => handleAdvance(advanceModal.match.player1_id!)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left hover:bg-green-50 hover:border-green-300 transition font-medium"
                >
                  🏆 {advanceModal.match.player1_name || `Player ${advanceModal.match.player1_id}`}
                </button>
              )}
              {advanceModal.match.player2_id && (
                <button
                  onClick={() => handleAdvance(advanceModal.match.player2_id!)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left hover:bg-green-50 hover:border-green-300 transition font-medium"
                >
                  🏆 {advanceModal.match.player2_name || `Player ${advanceModal.match.player2_id}`}
                </button>
              )}
            </div>
            <button
              onClick={() => setAdvanceModal(null)}
              className="w-full mt-3 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
