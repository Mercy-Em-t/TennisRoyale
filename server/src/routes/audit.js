const express = require('express');

function createRouter(db) {
  const router = express.Router();

  // GET /api/audit - List audit logs with filters
  router.get('/', (req, res) => {
    try {
      const { table_name, record_id, action, user_id, start_date, end_date, limit = 100, offset = 0 } = req.query;
      
      let sql = 'SELECT * FROM audit_logs';
      const params = [];
      const conditions = [];
      
      if (table_name) {
        conditions.push('table_name = ?');
        params.push(table_name);
      }
      if (record_id) {
        conditions.push('record_id = ?');
        params.push(record_id);
      }
      if (action) {
        conditions.push('action = ?');
        params.push(action);
      }
      if (user_id) {
        conditions.push('user_id = ?');
        params.push(user_id);
      }
      if (start_date) {
        conditions.push('timestamp >= ?');
        params.push(start_date);
      }
      if (end_date) {
        conditions.push('timestamp <= ?');
        params.push(end_date);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const logs = db.prepare(sql).all(...params);
      
      // Parse JSON fields
      const parsedLogs = logs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }));
      
      res.json(parsedLogs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/:id - Get a specific audit log entry
  router.get('/:id', (req, res) => {
    try {
      const log = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(req.params.id);
      if (!log) {
        return res.status(404).json({ error: 'Audit log not found' });
      }
      
      res.json({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/record/:table/:id - Get audit history for a specific record
  router.get('/record/:table/:id', (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE table_name = ? AND record_id = ?
        ORDER BY timestamp ASC
      `).all(req.params.table, req.params.id);
      
      const parsedLogs = logs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }));
      
      res.json({
        table_name: req.params.table,
        record_id: req.params.id,
        history: parsedLogs
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/tournament/:id - Get all audit logs for a tournament
  router.get('/tournament/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const { limit = 500, offset = 0 } = req.query;

      // Get tournament's direct audit logs
      const tournamentLogs = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE table_name = 'tournaments' AND record_id = ?
        ORDER BY timestamp DESC
      `).all(req.params.id);

      // Helper function to safely query logs in batches to avoid performance issues with large IN clauses
      const MAX_BATCH_SIZE = 500;
      function getLogsForTable(tableName, recordIds) {
        if (recordIds.length === 0) return [];
        
        const results = [];
        // Process in batches to avoid SQLite query limits
        for (let i = 0; i < recordIds.length; i += MAX_BATCH_SIZE) {
          const batch = recordIds.slice(i, i + MAX_BATCH_SIZE);
          const batchLogs = db.prepare(`
            SELECT * FROM audit_logs 
            WHERE table_name = ? AND record_id IN (${batch.map(() => '?').join(',')})
          `).all(tableName, ...batch);
          results.push(...batchLogs);
        }
        return results;
      }

      // Get registration IDs for this tournament
      const registrationIds = db.prepare(`
        SELECT id FROM registrations WHERE tournament_id = ?
      `).all(req.params.id).map(r => r.id);

      // Get pool IDs
      const poolIds = db.prepare(`
        SELECT id FROM pools WHERE tournament_id = ?
      `).all(req.params.id).map(p => p.id);

      // Get match IDs
      const matchIds = db.prepare(`
        SELECT id FROM matches WHERE tournament_id = ?
      `).all(req.params.id).map(m => m.id);

      // Get court IDs
      const courtIds = db.prepare(`
        SELECT id FROM courts WHERE tournament_id = ?
      `).all(req.params.id).map(c => c.id);

      // Build comprehensive query for all related records using batched queries
      let allLogs = [...tournamentLogs];

      allLogs = allLogs.concat(getLogsForTable('registrations', registrationIds));
      allLogs = allLogs.concat(getLogsForTable('pools', poolIds));
      allLogs = allLogs.concat(getLogsForTable('matches', matchIds));
      allLogs = allLogs.concat(getLogsForTable('courts', courtIds));

      // Sort by timestamp and paginate
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const paginatedLogs = allLogs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      const parsedLogs = paginatedLogs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }));

      res.json({
        tournament,
        total_logs: allLogs.length,
        logs: parsedLogs
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/stats - Get audit statistics
  router.get('/stats/summary', (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      let dateCondition = '';
      const params = [];
      
      if (start_date) {
        dateCondition += ' WHERE timestamp >= ?';
        params.push(start_date);
      }
      if (end_date) {
        dateCondition += (dateCondition ? ' AND' : ' WHERE') + ' timestamp <= ?';
        params.push(end_date);
      }

      const byTable = db.prepare(`
        SELECT table_name, COUNT(*) as count
        FROM audit_logs ${dateCondition}
        GROUP BY table_name
        ORDER BY count DESC
      `).all(...params);

      const byAction = db.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs ${dateCondition}
        GROUP BY action
        ORDER BY count DESC
      `).all(...params);

      const total = db.prepare(`
        SELECT COUNT(*) as total FROM audit_logs ${dateCondition}
      `).get(...params);

      const recentActivity = db.prepare(`
        SELECT date(timestamp) as date, COUNT(*) as count
        FROM audit_logs
        GROUP BY date(timestamp)
        ORDER BY date DESC
        LIMIT 30
      `).all();

      res.json({
        total: total.total,
        by_table: byTable,
        by_action: byAction,
        recent_activity: recentActivity
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/match/:id - Get audit trail for a specific match (useful for disputes)
  router.get('/match/:id', (req, res) => {
    try {
      const match = db.prepare(`
        SELECT m.*, 
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.id = ?
      `).get(req.params.id);
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const logs = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE table_name = 'matches' AND record_id = ?
        ORDER BY timestamp ASC
      `).all(req.params.id);

      const parsedLogs = logs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }));

      // Extract score change history
      const scoreChanges = parsedLogs
        .filter(log => log.action === 'update' && log.new_values && 
                (log.new_values.player1_score || log.new_values.player2_score))
        .map(log => ({
          timestamp: log.timestamp,
          player1_score: log.new_values.player1_score,
          player2_score: log.new_values.player2_score,
          status: log.new_values.status
        }));

      res.json({
        match,
        audit_trail: parsedLogs,
        score_history: scoreChanges
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
