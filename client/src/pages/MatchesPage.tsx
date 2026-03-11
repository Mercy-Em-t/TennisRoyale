import React, { useEffect, useState, useCallback } from 'react';
import { getMatches, scheduleMatch, scoreMatch } from '../api';
import { Match, Tournament } from '../types';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

type MatchTab = 'pool' | 'bracket' | 'late';

const statusColors: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MatchesPage({ tournamentId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<MatchTab>('pool');
  const [scheduleModal, setScheduleModal] = useState<Match | null>(null);
  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scoreForm, setScoreForm] = useState({ score_player1: '', score_player2: '', winner_id: '' });
  const [poolFilter, setPoolFilter] = useState<number | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const res = await getMatches(tournamentId);
      setMatches(res.data.matches || res.data || []);
    } catch {
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const poolMatches = matches.filter((m) => m.pool_id !== null && !m.is_late_registration);
  const bracketMatches = matches.filter((m) => m.pool_id === null);
  const lateMatches = matches.filter((m) => m.is_late_registration);

  const pools = Array.from(new Set(poolMatches.map((m) => m.pool_id))).filter(Boolean) as number[];

  const displayed = tab === 'pool'
    ? (poolFilter === 'all' ? poolMatches : poolMatches.filter((m) => m.pool_id === poolFilter))
    : tab === 'bracket' ? bracketMatches : lateMatches;

  const handleSchedule = async () => {
    if (!scheduleModal || !scheduleDate) return;
    try {
      await scheduleMatch(tournamentId, scheduleModal.id, new Date(scheduleDate).toISOString());
      await load();
      setScheduleModal(null);
      setScheduleDate('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to schedule');
    }
  };

  const handleScore = async () => {
    if (!scoreModal) return;
    try {
      await scoreMatch(tournamentId, scoreModal.id, {
        score_player1: scoreForm.score_player1,
        score_player2: scoreForm.score_player2,
        winner_id: scoreForm.winner_id ? Number(scoreForm.winner_id) : undefined,
      });
      await load();
      setScoreModal(null);
      setScoreForm({ score_player1: '', score_player2: '', winner_id: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to score match');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex gap-2 mb-4">
          {(['pool', 'bracket', 'late'] as MatchTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t === 'pool' ? `Pool Matches (${poolMatches.length})` : t === 'bracket' ? `Bracket Matches (${bracketMatches.length})` : `Late Reg Matches (${lateMatches.length})`}
            </button>
          ))}
        </div>

        {tab === 'pool' && pools.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setPoolFilter('all')}
              className={`px-2 py-1 rounded text-xs font-medium transition ${poolFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All Pools
            </button>
            {pools.map((pid) => (
              <button
                key={pid}
                onClick={() => setPoolFilter(pid)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${poolFilter === pid ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Pool {pid}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No matches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Match</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Round</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Scheduled</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Score</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayed.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-medium">{match.player1_name || `Player ${match.player1_id}`}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="font-medium">{match.player2_name || (match.player2_id ? `Player ${match.player2_id}` : 'TBD')}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">R{match.round}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {match.score_player1 || match.score_player2 ? (
                        <span className="font-mono text-sm">{match.score_player1 || '?'} — {match.score_player2 || '?'}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[match.status] || 'bg-gray-100 text-gray-500'}`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setScheduleModal(match); setScheduleDate(match.scheduled_at ? match.scheduled_at.slice(0, 16) : ''); }}
                          className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200 transition"
                        >
                          Schedule
                        </button>
                        {match.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setScoreModal(match);
                              setScoreForm({
                                score_player1: match.score_player1 || '',
                                score_player2: match.score_player2 || '',
                                winner_id: match.winner_id ? String(match.winner_id) : '',
                              });
                            }}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition"
                          >
                            Score
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Schedule Match</h3>
            <p className="text-sm text-gray-600 mb-3">
              {scheduleModal.player1_name} vs {scheduleModal.player2_name || 'TBD'}
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setScheduleModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSchedule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Record Score</h3>
            <p className="text-sm text-gray-600 mb-4">
              {scoreModal.player1_name} vs {scoreModal.player2_name || 'TBD'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{scoreModal.player1_name} score</label>
                <input
                  type="text"
                  placeholder="e.g. 6-3, 6-4"
                  value={scoreForm.score_player1}
                  onChange={(e) => setScoreForm({ ...scoreForm, score_player1: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{scoreModal.player2_name || 'Player 2'} score</label>
                <input
                  type="text"
                  placeholder="e.g. 3-6, 4-6"
                  value={scoreForm.score_player2}
                  onChange={(e) => setScoreForm({ ...scoreForm, score_player2: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Winner</label>
                <select
                  value={scoreForm.winner_id}
                  onChange={(e) => setScoreForm({ ...scoreForm, winner_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select winner</option>
                  {scoreModal.player1_id && <option value={scoreModal.player1_id}>{scoreModal.player1_name}</option>}
                  {scoreModal.player2_id && <option value={scoreModal.player2_id}>{scoreModal.player2_name}</option>}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setScoreModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleScore} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">Save Score</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
