const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/waivers - List waivers with filters
  router.get('/', (req, res) => {
    try {
      const { registration_id, tournament_id, waiver_type, signed, limit = 100, offset = 0 } = req.query;
      
      let sql = `
        SELECT w.*, r.tournament_id, p.first_name, p.last_name, p.email,
               t.name as tournament_name
        FROM waivers w
        JOIN registrations r ON w.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
      `;
      const params = [];
      const conditions = [];
      
      if (registration_id) {
        conditions.push('w.registration_id = ?');
        params.push(registration_id);
      }
      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      if (waiver_type) {
        conditions.push('w.waiver_type = ?');
        params.push(waiver_type);
      }
      if (signed !== undefined) {
        conditions.push('w.signed = ?');
        params.push(signed === 'true' ? 1 : 0);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const waivers = db.prepare(sql).all(...params);
      res.json(waivers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/waivers/:id - Get a specific waiver
  router.get('/:id', (req, res) => {
    try {
      const waiver = db.prepare(`
        SELECT w.*, r.tournament_id, p.first_name, p.last_name, p.email, p.phone,
               t.name as tournament_name
        FROM waivers w
        JOIN registrations r ON w.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE w.id = ?
      `).get(req.params.id);
      
      if (!waiver) {
        return res.status(404).json({ error: 'Waiver not found' });
      }
      res.json(waiver);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/waivers - Create a waiver requirement
  router.post('/', (req, res) => {
    try {
      const { registration_id, waiver_type = 'liability', emergency_contact_name, emergency_contact_phone, medical_conditions } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // Check if waiver of this type already exists
      const existing = db.prepare('SELECT id FROM waivers WHERE registration_id = ? AND waiver_type = ?')
        .get(registration_id, waiver_type);
      if (existing) {
        return res.status(409).json({ error: 'Waiver of this type already exists', waiver_id: existing.id });
      }

      const stmt = db.prepare(`
        INSERT INTO waivers (registration_id, waiver_type, emergency_contact_name, emergency_contact_phone, medical_conditions)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(registration_id, waiver_type, emergency_contact_name, emergency_contact_phone, medical_conditions);
      
      const waiver = db.prepare('SELECT * FROM waivers WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'waivers', waiver.id, 'create', null, waiver);
      
      res.status(201).json(waiver);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/waivers/:id/sign - Sign a waiver
  router.post('/:id/sign', (req, res) => {
    try {
      const waiver = db.prepare('SELECT * FROM waivers WHERE id = ?').get(req.params.id);
      if (!waiver) {
        return res.status(404).json({ error: 'Waiver not found' });
      }

      if (waiver.signed) {
        return res.status(400).json({ error: 'Waiver has already been signed' });
      }

      const { signature_data, emergency_contact_name, emergency_contact_phone, medical_conditions, ip_address } = req.body;
      
      if (!signature_data) {
        return res.status(400).json({ error: 'Signature data is required' });
      }

      db.prepare(`
        UPDATE waivers SET 
          signed = 1,
          signature_data = ?,
          signed_at = CURRENT_TIMESTAMP,
          ip_address = ?,
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          medical_conditions = COALESCE(?, medical_conditions)
        WHERE id = ?
      `).run(signature_data, ip_address, emergency_contact_name, emergency_contact_phone, medical_conditions, req.params.id);

      // Update registration waiver status
      const allWaiversSigned = db.prepare(`
        SELECT COUNT(*) as unsigned FROM waivers WHERE registration_id = ? AND signed = 0
      `).get(waiver.registration_id);

      if (allWaiversSigned.unsigned === 0) {
        db.prepare(`
          UPDATE registrations SET waiver_signed = 1, waiver_date = CURRENT_TIMESTAMP WHERE id = ?
        `).run(waiver.registration_id);
      }

      const updatedWaiver = db.prepare(`
        SELECT w.*, p.first_name, p.last_name
        FROM waivers w
        JOIN registrations r ON w.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE w.id = ?
      `).get(req.params.id);
      
      createAuditLog(db, 'waivers', waiver.id, 'update', waiver, updatedWaiver);

      res.json({ message: 'Waiver signed successfully', waiver: updatedWaiver });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/waivers/create-for-tournament - Create waivers for all registrations in a tournament
  router.post('/create-for-tournament', (req, res) => {
    try {
      const { tournament_id, waiver_types = ['liability'] } = req.body;
      
      if (!tournament_id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const registrations = db.prepare('SELECT id FROM registrations WHERE tournament_id = ?').all(tournament_id);

      const createWaivers = db.transaction(() => {
        let created = 0;
        
        registrations.forEach(reg => {
          waiver_types.forEach(waiver_type => {
            // Check if already exists
            const existing = db.prepare('SELECT id FROM waivers WHERE registration_id = ? AND waiver_type = ?')
              .get(reg.id, waiver_type);
            
            if (!existing) {
              db.prepare(`
                INSERT INTO waivers (registration_id, waiver_type) VALUES (?, ?)
              `).run(reg.id, waiver_type);
              created++;
            }
          });
        });
        
        return created;
      });

      const totalCreated = createWaivers();
      
      res.status(201).json({ 
        message: `Created ${totalCreated} waivers for tournament`,
        waiver_types,
        registration_count: registrations.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/waivers/tournament/:tournament_id/status - Get waiver status for tournament
  router.get('/tournament/:tournament_id/status', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const summary = db.prepare(`
        SELECT 
          COUNT(DISTINCT r.id) as total_registrations,
          SUM(CASE WHEN r.waiver_signed = 1 THEN 1 ELSE 0 END) as waivers_complete,
          COUNT(w.id) as total_waivers,
          SUM(CASE WHEN w.signed = 1 THEN 1 ELSE 0 END) as signed_waivers
        FROM registrations r
        LEFT JOIN waivers w ON r.id = w.registration_id
        WHERE r.tournament_id = ?
      `).get(req.params.tournament_id);

      const pendingWaivers = db.prepare(`
        SELECT w.id, w.waiver_type, w.created_at, p.first_name, p.last_name, p.email, r.id as registration_id
        FROM waivers w
        JOIN registrations r ON w.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ? AND w.signed = 0
        ORDER BY p.last_name, p.first_name
      `).all(req.params.tournament_id);

      res.json({ 
        tournament,
        summary,
        pending_waivers: pendingWaivers
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/waivers/registration/:registration_id - Get all waivers for a registration
  router.get('/registration/:registration_id', (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(req.params.registration_id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      const waivers = db.prepare('SELECT * FROM waivers WHERE registration_id = ? ORDER BY waiver_type')
        .all(req.params.registration_id);

      res.json({ registration, waivers });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/waivers/:id - Delete a waiver (only if unsigned)
  router.delete('/:id', (req, res) => {
    try {
      const waiver = db.prepare('SELECT * FROM waivers WHERE id = ?').get(req.params.id);
      if (!waiver) {
        return res.status(404).json({ error: 'Waiver not found' });
      }

      if (waiver.signed) {
        return res.status(400).json({ error: 'Cannot delete a signed waiver' });
      }

      db.prepare('DELETE FROM waivers WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'waivers', waiver.id, 'delete', waiver, null);

      res.json({ message: 'Waiver deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
