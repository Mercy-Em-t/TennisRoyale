const express = require('express');
const { v4: uuidv4 } = require('uuid');

function createMessageRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // List messages for a tournament
  router.get('/', (req, res) => {
    const messages = db.prepare(
      'SELECT * FROM tournament_messages WHERE tournament_id = ? ORDER BY created_at DESC'
    ).all(req.params.tournamentId);
    res.json(messages);
  });

  // Send a message
  router.post('/', (req, res) => {
    const { subject, body, recipient_type } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });

    const id = uuidv4();
    db.prepare(
      'INSERT INTO tournament_messages (id, tournament_id, subject, body, recipient_type) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.params.tournamentId, subject, body, recipient_type || 'broadcast');

    const message = db.prepare('SELECT * FROM tournament_messages WHERE id = ?').get(id);
    res.status(201).json(message);
  });

  return router;
}

module.exports = createMessageRoutes;
