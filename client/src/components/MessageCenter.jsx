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
import React, { useState, useEffect } from 'react';
import { getMessages, sendMessage } from '../utils/api';

export default function MessageCenter({ tournamentId }) {
  const [messages, setMessages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', recipient_type: 'broadcast' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [tournamentId]);

  async function loadMessages() {
    try {
      const data = await getMessages(tournamentId);
      setMessages(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    try {
      await sendMessage(tournamentId, form);
      setForm({ subject: '', body: '', recipient_type: 'broadcast' });
      setShowForm(false);
      loadMessages();
    } catch {
      /* empty */
    }
  }

  return (
    <div className="message-center" data-testid="message-center">
      <div className="section-header">
        <span>{messages.length} messages</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Message'}
        </button>
      </div>

      {showForm && (
        <form className="message-form" onSubmit={handleSend} data-testid="message-form">
          <div className="form-field">
            <input
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <textarea
              placeholder="Message body..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows="3"
              required
            />
          </div>
          <div className="form-field">
            <select
              value={form.recipient_type}
              onChange={(e) => setForm({ ...form, recipient_type: e.target.value })}
              aria-label="Recipient type"
            >
              <option value="broadcast">📢 Broadcast to all</option>
              <option value="staff">👥 Staff only</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Send Message</button>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="empty-state-sm">No messages sent yet</div>
      ) : (
        <div className="message-list">
          {messages.map((msg) => (
            <div key={msg.id} className="message-card">
              <div className="message-header">
                <span className="message-subject">{msg.subject}</span>
                <span className="message-type">
                  {msg.recipient_type === 'broadcast' ? '📢' : '👥'}
                </span>
              </div>
              <p className="message-body">{msg.body}</p>
              <span className="message-time">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
