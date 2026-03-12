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
