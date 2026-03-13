import React, { useState, useEffect } from 'react';
import { getMessages, sendMessage, getRegistrations } from '../api';

interface Message {
  id: number;
  subject: string;
  body: string;
  recipient_type: string;
  is_broadcast?: boolean;
  recipient_name?: string;
  created_at: string;
}

interface Registration {
  player_id?: number;
  id?: number;
  player_name?: string;
  playerName?: string;
}

export default function MessageCenter({ tournamentId }: { tournamentId: number | string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', recipient_type: 'broadcast', recipientPlayerId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [msgRes, regRes] = await Promise.all([
        getMessages(Number(tournamentId)),
        getRegistrations(Number(tournamentId)),
      ]);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []);
      setRegistrations(Array.isArray(regRes.data) ? regRes.data : regRes.data.players || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tournamentId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    setError('');
    try {
      await sendMessage(Number(tournamentId), {
        subject: form.subject.trim(),
        body: form.body.trim(),
        isBroadcast: form.recipient_type === 'broadcast',
        recipientPlayerId: form.recipient_type === 'direct' ? form.recipientPlayerId : undefined,
      });
      setForm({ subject: '', body: '', recipient_type: 'broadcast', recipientPlayerId: '' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400 italic">Accessing message center...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Communications</h3>
          <p className="text-xs text-gray-400 font-medium">Broadcast updates to all participants or message individual players</p>
        </div>
        <button
          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'New Message'}
        </button>
      </div>

      {showForm && (
        <form className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-500" onSubmit={handleSend}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Send To</label>
              <select
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                value={form.recipient_type}
                onChange={e => setForm({ ...form, recipient_type: e.target.value })}
              >
                <option value="broadcast">📢 All Participants (Broadcast)</option>
                <option value="direct">👤 Specific Participant</option>
              </select>
            </div>
            {form.recipient_type === 'direct' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Select Player</label>
                <select
                  className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  value={form.recipientPlayerId}
                  onChange={e => setForm({ ...form, recipientPlayerId: e.target.value })}
                  required
                >
                  <option value="">Choose a player...</option>
                  {registrations.map(r => (
                    <option key={r.player_id || r.id} value={r.player_id || r.id}>
                      {r.player_name || r.playerName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Subject</label>
            <input
              type="text"
              placeholder="e.g. Schedule Change for Pool A"
              className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Message Content</label>
            <textarea
              placeholder="Type your message here..."
              className="w-full bg-gray-50 border border-transparent rounded-3xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              required
              rows={4}
            />
          </div>

          <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition shadow-xl mt-4">
            Transmit Message
          </button>
          {error && <p className="text-xs text-red-500 font-bold text-center mt-2">⚠️ {error}</p>}
        </form>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">✉️</div>
          <h4 className="text-gray-900 font-bold text-lg tracking-tight">Inbox is empty</h4>
          <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">No communications have been sent for this tournament yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(m => (
            <div key={m.id} className="bg-white border border-gray-50 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-gray-200 font-black text-4xl select-none italic tracking-tighter">#{m.id}</span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${m.recipient_type === 'broadcast' || m.is_broadcast ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {m.recipient_type === 'broadcast' || m.is_broadcast ? '📢 Broadcast' : `👤 Direct Message`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-300">{new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight mb-2">{m.subject}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{m.body}</p>
                </div>
                {!m.is_broadcast && m.recipient_name && (
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-50 pt-3">
                    TO: <span className="text-gray-600">{m.recipient_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
