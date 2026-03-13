import React, { useState, useEffect } from 'react';
import { getMatches, scheduleMatch, scoreMatch } from '../api';

interface Match {
  id: number;
  player1_id: number | null;
  player2_id: number | null;
  player1_name?: string;
  player2_name?: string;
  Player1?: { playerName: string };
  Player2?: { playerName: string };
  player1Name?: string;
  player2Name?: string;
  score_player1: number | null;
  scorePlayer1?: number | null;
  score_player2: number | null;
  scorePlayer2?: number | null;
  status: string;
  winner_id: number | null;
  winnerId?: number | null;
  winner_name?: string;
  winnerName?: string;
  bracket_stage?: string;
  bracketStage?: string;
  stage?: string;
  round?: string;
  scheduled_at: string | null;
  scheduledAt?: string | null;
}

export default function MatchList({ tournamentId, status }: { tournamentId: number | string, status: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatches = async () => {
    try {
      const res = await getMatches(Number(tournamentId));
      setMatches(Array.isArray(res.data) ? res.data : res.data.matches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, [tournamentId]);

  if (loading) return <div className="text-center py-12 text-gray-500 italic">Retreiving matches...</div>;

  const grouped: Record<string, Match[]> = {};
  matches.forEach((m) => {
    const stage = m.bracket_stage || m.bracketStage || m.stage || m.round || 'Pool Play';
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(m);
  });

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Tournament Schedule</h3>
        <button
          className="text-blue-600 text-xs font-bold uppercase tracking-widest hover:text-blue-700 transition"
          onClick={fetchMatches}
        >
          Refresh All
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm border border-red-100">⚠️ {error}</div>}

      {matches.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-4">🎾</div>
          <h4 className="text-gray-900 font-bold">No matches generated</h4>
          <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Matches will appear here once the tournament starts or pools are generated.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([stage, stageMatches]) => (
          <div key={stage} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h4 className="text-xs font-black uppercase tracking-[.2em] text-gray-400 mb-6 ml-1 flex items-center gap-3">
              <span className="w-8 h-px bg-gray-200"></span>
              {stage}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stageMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  tournamentId={Number(tournamentId)}
                  editable={status === 'in_progress'}
                  onUpdated={fetchMatches}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MatchCard({ match, tournamentId, editable, onUpdated }: { match: Match, tournamentId: number, editable: boolean, onUpdated: () => void }) {
  const [scheduling, setScheduling] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const player1Name = match.player1_name || match.Player1?.playerName || match.player1Name || `P1 (${match.player1_id || '?'})`;
  const player2Name = match.player2_name || match.Player2?.playerName || match.player2Name || `P2 (${match.player2_id || '?'})`;
  const isCompleted = !!(match.winner_id || match.winnerId || match.status === 'completed');

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    setLoading(true);
    setError('');
    try {
      await scheduleMatch(tournamentId, match.id, scheduledAt);
      setScheduling(false);
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    setLoading(true);
    setError('');
    try {
      await scoreMatch(tournamentId, match.id, {
        score_player1: Number(score1),
        score_player2: Number(score2)
      });
      setScoring(false);
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to score');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white border rounded-3xl p-6 shadow-sm transition-all duration-300 relative overflow-hidden group hover:shadow-lg ${isCompleted ? 'border-green-100 bg-green-50/10' : 'border-gray-100'}`}>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400">
          <span>Match #{match.id}</span>
          {isCompleted && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-[9px]">Completed</span>}
        </div>

        <div className="flex justify-between items-center gap-4 bg-gray-50/50 rounded-2xl p-4 border border-gray-50">
          <div className="flex-1 flex flex-col items-center text-center">
            <span className={`text-sm font-bold transition-colors ${match.winner_id === match.player1_id ? 'text-green-600 scale-110' : 'text-gray-900'}`}>{player1Name}</span>
            {match.winner_id === match.player1_id && <span className="text-[8px] font-black text-green-500 mt-1 uppercase tracking-tighter">Winner</span>}
          </div>
          <div className="text-[10px] font-black text-gray-200">VS</div>
          <div className="flex-1 flex flex-col items-center text-center">
            <span className={`text-sm font-bold transition-colors ${match.winner_id === match.player2_id ? 'text-green-600 scale-110' : 'text-gray-900'}`}>{player2Name}</span>
            {match.winner_id === match.player2_id && <span className="text-[8px] font-black text-green-500 mt-1 uppercase tracking-tighter">Winner</span>}
          </div>
        </div>

        {((match.score_player1 ?? match.scorePlayer1) != null) && (
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {match.score_player1 ?? match.scorePlayer1} — {match.score_player2 ?? match.scorePlayer2}
            </div>
            {match.winner_name && <span className="text-[10px] font-bold text-gray-400">{match.winner_name} advanced</span>}
          </div>
        )}

        {(match.scheduled_at || match.scheduledAt) && !scoring && !scheduling && (
          <div className="text-center text-[10px] font-bold text-gray-400 bg-gray-50 py-1 rounded-full">
            📅 {new Date(match.scheduled_at || match.scheduledAt!).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {error && <p className="bg-red-50 text-red-500 p-2 rounded-lg text-[10px] text-center border border-red-100">⚠️ {error}</p>}

        {editable && !isCompleted && (
          <div className="mt-2 flex flex-col gap-3">
            {!scheduling && !scoring && (
              <div className="flex gap-2">
                <button onClick={() => setScheduling(true)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Set Time</button>
                <button onClick={() => setScoring(true)} className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition">Enter Score</button>
              </div>
            )}

            {scheduling && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                <input
                  type="datetime-local"
                  className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={handleSchedule} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:bg-gray-300">Save</button>
                  <button onClick={() => setScheduling(false)} className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Cancel</button>
                </div>
              </div>
            )}

            {scoring && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <input
                    type="number"
                    placeholder="P1"
                    min="0"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    className="w-16 bg-white border border-gray-200 rounded-xl p-3 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-300 font-bold">—</span>
                  <input
                    type="number"
                    placeholder="P2"
                    min="0"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    className="w-16 bg-white border border-gray-200 rounded-xl p-3 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleScore} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:bg-gray-300">Finalize Score</button>
                  <button onClick={() => setScoring(false)} className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
