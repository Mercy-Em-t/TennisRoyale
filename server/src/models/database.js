const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initializeDb(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'player' CHECK (role IN ('player', 'host', 'referee', 'admin')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived')),
      max_players INTEGER DEFAULT 32,
      entry_fee REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      skill_level TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
      is_late INTEGER DEFAULT 0,
      seed INTEGER,
      status TEXT DEFAULT 'registered',
      qr_code TEXT UNIQUE,
      check_in_time TEXT,
      payment_status TEXT DEFAULT 'pending',
      payment_amount REAL,
      payment_date TEXT,
      waiver_signed INTEGER DEFAULT 0,
      waiver_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(tournament_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      pool_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pool_players (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      seed_in_pool INTEGER,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      UNIQUE(pool_id, registration_id)
    );

    CREATE TABLE IF NOT EXISTS courts (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      pool_id TEXT,
      court_id TEXT,
      player1_registration_id TEXT NOT NULL,
      player2_registration_id TEXT NOT NULL,
      scheduled_time TEXT,
      status TEXT DEFAULT 'scheduled',
      winner_registration_id TEXT,
      player1_score INTEGER,
      player2_score INTEGER,
      bracket_stage TEXT DEFAULT 'pool',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE SET NULL,
      FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE SET NULL,
      FOREIGN KEY (player1_registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      FOREIGN KEY (player2_registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      FOREIGN KEY (winner_registration_id) REFERENCES registrations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS waivers (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      signed INTEGER DEFAULT 0,
      signed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync('password123', 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'System Admin', 'admin@tennisroyale.com', hashedPassword, 'admin');

    console.log('Default admin user created: admin@tennisroyale.com / password123');
  }
}

function createAuditLog(db, tableName, recordId, action, oldValues, newValues) {
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO audit_logs (id, table_name, record_id, action, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tableName,
      recordId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    );
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

function getDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return new Database(dbPath);
}

module.exports = {
  getDb,
  initializeDb,
  createAuditLog
};
