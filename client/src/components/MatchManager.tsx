import React, { useState, useEffect } from 'react';
import { getMatches, createMatch, updateMatch, deleteMatch, getRegistrations, scoreMatch } from '../api';

const stageLabels: Record<string, string> = {
  pool: 'Pool Stage',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'Final',
};

interface Player {
  player_id: number;
  player_name: string;
}

interface Match {
  id: number;
  player1_id: number | null;
  player2_id: number | null;
  player1_name?: string;
  player2_name?: string;
  score_player1: number | null;
  score_player2: number | null;
  status: string;
  winner_id: number | null;
  winner_name?: string;
  bracket_stage: string;
  scheduled_at: string | null;
}

export default function MatchManager({ tournamentId, onUpdate }: { tournamentId: number | string, onUpdate: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player1_id: '', player2_id: '', bracket_stage: 'pool', scheduled_at: '' });
  const [scoreForm, setScoreForm] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  async function loadData() {
    try {
      const [matchRes, regRes] = await Promise.all([
        getMatches(Number(tournamentId)),
        getRegistrations(Number(tournamentId)),
      ]);
      setMatches(Array.isArray(matchRes.data) ? matchRes.data : matchRes.data.matches || []);
      setPlayers(Array.isArray(regRes.data) ? regRes.data : regRes.data.players || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.player1_id || !form.player2_id) return;
    try {
      await createMatch(Number(tournamentId), form);
      setForm({ player1_id: '', player2_id: '', bracket_stage: 'pool', scheduled_at: '' });
      setShowForm(false);
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleScore(matchId: number) {
    const scores = scoreForm[matchId];
    if (!scores || scores.score_player1 == null || scores.score_player2 == null) return;
    try {
      await scoreMatch(Number(tournamentId), matchId, {
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

  async function handleDeleteMatch(matchId: number) {
    if (!window.confirm('Delete this match?')) return;
    try {
      await deleteMatch(Number(tournamentId), matchId);
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  const grouped = matches.reduce((acc: Record<string, Match[]>, m) => {
    const stage = m.bracket_stage || 'pool';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(m);
    return acc;
  }, {});

  return (
    <div className="match-manager">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Match Schedule</h3>
        <button
          className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Match'}
        </button>
      </div>

      {showForm && (
        <form className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8 space-y-4" onSubmit={handleCreateMatch}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Player 1</label>
              <select
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Player 2</label>
              <select
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Stage</label>
              <select
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.bracket_stage}
                onChange={(e) => setForm({ ...form, bracket_stage: e.target.value })}
              >
                <option value="pool">Pool</option>
                <option value="quarterfinal">Quarterfinal</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Schedule</label>
              <input
                type="datetime-local"
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm">Schedule Match</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 italic">Retreiving matches...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-4">🎾</div>
          <h4 className="text-gray-900 font-bold">No matches scheduled</h4>
          <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Start scheduling matches for the participants in this tournament.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([stage, stageMatches]) => (
            <div key={stage} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                {stageLabels[stage] || stage}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageMatches.map((match) => (
                  <div key={match.id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition relative group ${match.status === 'completed' ? 'border-green-100 bg-green-50/20' : 'border-gray-100'}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <span className={`text-sm font-bold ${match.winner_id === match.player1_id ? 'text-green-600' : 'text-gray-900'}`}>{match.player1_name || 'TBD'}</span>
                        <span className="text-[10px] font-bold text-gray-300">VS</span>
                        <span className={`text-sm font-bold text-right ${match.winner_id === match.player2_id ? 'text-green-600' : 'text-gray-900'}`}>{match.player2_name || 'TBD'}</span>
                      </div>

                      {match.status === 'completed' ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-lg font-black text-gray-900 tracking-tighter">
                            {match.score_player1} — {match.score_player2}
                          </div>
                          {match.winner_name && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🏆 WINNER: {match.winner_name}</span>}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="P1"
                            className="bg-white border border-gray-200 rounded-lg w-14 p-2 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={scoreForm[match.id]?.score_player1 ?? ''}
                            onChange={(e) => setScoreForm({
                              ...scoreForm,
                              [match.id]: { ...scoreForm[match.id], score_player1: e.target.value }
                            })}
                          />
                          <span className="text-gray-300 font-bold">—</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="P2"
                            className="bg-white border border-gray-200 rounded-lg w-14 p-2 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={scoreForm[match.id]?.score_player2 ?? ''}
                            onChange={(e) => setScoreForm({
                              ...scoreForm,
                              [match.id]: { ...scoreForm[match.id], score_player2: e.target.value }
                            })}
                          />
                          <button
                            className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition"
                            onClick={() => handleScore(match.id)}
                          >
                            Save
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 border-t pt-2 border-gray-50">
                        <span className="flex items-center gap-1">
                          {match.scheduled_at ? `🕐 ${new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not Scheduled'}
                        </span>
                        <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1" onClick={() => handleDeleteMatch(match.id)}>DELETE</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
