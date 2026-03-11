import { useState, useEffect } from 'react';
import { listMessages, sendMessage, listRegistrations } from '../utils/api';

export default function MessageCenter({ tournamentId }) {
  const [messages, setMessages] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [recipientPlayerId, setRecipientPlayerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [msgData, regData] = await Promise.all([
        listMessages(tournamentId),
        listRegistrations(tournamentId),
      ]);
      setMessages(Array.isArray(msgData) ? msgData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tournamentId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setError('');
    try {
      const payload = {
        subject: subject.trim(),
        body: body.trim(),
        isBroadcast,
        recipientPlayerId: isBroadcast ? undefined : recipientPlayerId || undefined,
      };
      await sendMessage(tournamentId, payload);
      setSubject('');
      setBody('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading messages…</p>;

  return (
    <div className="message-center">
      <h3>Messages</h3>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSend} className="message-form">
        <div className="message-type-toggle">
          <label className={`toggle-option ${isBroadcast ? 'active' : ''}`}>
            <input type="radio" name="msgType" checked={isBroadcast} onChange={() => setIsBroadcast(true)} />
            📢 Broadcast
          </label>
          <label className={`toggle-option ${!isBroadcast ? 'active' : ''}`}>
            <input type="radio" name="msgType" checked={!isBroadcast} onChange={() => setIsBroadcast(false)} />
            👤 To Participant
          </label>
        </div>
        {!isBroadcast && (
          <select value={recipientPlayerId} onChange={e => setRecipientPlayerId(e.target.value)} required>
            <option value="">Select participant…</option>
            {registrations.map(r => (
              <option key={r.player_id || r.id} value={r.player_id || r.id}>
                {r.player_name || r.playerName}
              </option>
            ))}
          </select>
        )}
        <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required />
        <textarea placeholder="Message body…" value={body} onChange={e => setBody(e.target.value)} required rows="2" />
        <button type="submit">Send Message</button>
      </form>

      {messages.length === 0 ? (
        <p className="empty">No messages sent yet.</p>
      ) : (
        <div className="message-list">
          {messages.map(m => (
            <div key={m.id} className={`message-card ${m.is_broadcast ? 'broadcast' : 'direct'}`}>
              <div className="message-header">
                <span className="message-badge">{m.is_broadcast ? '📢 Broadcast' : `👤 To: ${m.recipient_name || 'Participant'}`}</span>
                <span className="message-date">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</span>
              </div>
              <div className="message-subject">{m.subject}</div>
              <p className="message-body">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
