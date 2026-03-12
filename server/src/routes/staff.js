const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');

function createStaffRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // List staff for a tournament
  router.get('/', (req, res) => {
    const staff = db.prepare(
      'SELECT * FROM tournament_staff WHERE tournament_id = ? ORDER BY role, name'
    ).all(req.params.tournamentId);
    res.json(staff);
  });

  // Add staff member (host only)
  router.post('/', requireRole('host'), (req, res) => {
    const { name, role, email } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });

    const id = uuidv4();
    db.prepare(
      'INSERT INTO tournament_staff (id, tournament_id, name, role, email) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.params.tournamentId, name, role, email || null);

    const staff = db.prepare('SELECT * FROM tournament_staff WHERE id = ?').get(id);
    res.status(201).json(staff);
  });

  // Remove staff member (host only)
  router.delete('/:staffId', requireRole('host'), (req, res) => {
    const staff = db.prepare(
      'SELECT * FROM tournament_staff WHERE id = ? AND tournament_id = ?'
    ).get(req.params.staffId, req.params.tournamentId);
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    db.prepare('DELETE FROM tournament_staff WHERE id = ?').run(req.params.staffId);
    res.json({ message: 'Staff member removed' });
  });

  return router;
}

module.exports = createStaffRoutes;
