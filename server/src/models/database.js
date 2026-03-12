const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase(dbPath) {
  const db = new Database(dbPath);
  
  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    -- Tournaments table
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived')),
      max_players INTEGER DEFAULT 32,
      entry_fee REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Players table (master list)
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      date_of_birth TEXT,
      skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
      photo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Registrations table (tournament enrollments)
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
      is_late INTEGER DEFAULT 0,
      seed INTEGER,
      status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'checked_in', 'withdrawn', 'no_show')),
      qr_code TEXT UNIQUE,
      check_in_time TEXT,
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
      payment_amount REAL,
      payment_date TEXT,
      waiver_signed INTEGER DEFAULT 0,
      waiver_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(tournament_id, player_id)
    );

    -- Pools table (group play divisions)
    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      pool_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    -- Pool players table
    CREATE TABLE IF NOT EXISTS pool_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL,
      registration_id INTEGER NOT NULL,
      seed_in_pool INTEGER,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      games_lost INTEGER DEFAULT 0,
      points_won INTEGER DEFAULT 0,
      points_lost INTEGER DEFAULT 0,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      UNIQUE(pool_id, registration_id)
    );

    -- Courts table
    CREATE TABLE IF NOT EXISTS courts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      surface TEXT CHECK (surface IN ('hard', 'clay', 'grass', 'carpet', 'synthetic')),
      location TEXT,
      is_available INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    -- Matches table
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      pool_id INTEGER,
      court_id INTEGER,
      player1_registration_id INTEGER NOT NULL,
      player2_registration_id INTEGER NOT NULL,
      scheduled_time TEXT,
      actual_start_time TEXT,
      actual_end_time TEXT,
      status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'forfeited', 'postponed')),
      winner_registration_id INTEGER,
      player1_score TEXT,
      player2_score TEXT,
      bracket_stage TEXT CHECK (bracket_stage IN ('pool', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final', 'third_place')),
      bracket_position INTEGER,
      round_number INTEGER,
      match_number INTEGER,
      referee_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE SET NULL,
      FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE SET NULL,
      FOREIGN KEY (player1_registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      FOREIGN KEY (player2_registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      FOREIGN KEY (winner_registration_id) REFERENCES registrations(id) ON DELETE SET NULL
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
      old_values TEXT,
      new_values TEXT,
      user_id INTEGER,
      user_role TEXT,
      ip_address TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'KES',
      payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'card', 'bank_transfer', 'waived', 'refund')),
      transaction_id TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      receipt_number TEXT,
      notes TEXT,
      processed_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    );

    -- Waivers table
    CREATE TABLE IF NOT EXISTS waivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      waiver_type TEXT DEFAULT 'liability' CHECK (waiver_type IN ('liability', 'medical', 'photo_release', 'rules_agreement')),
      signed INTEGER DEFAULT 0,
      signature_data TEXT,
      signed_at TEXT,
      ip_address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      medical_conditions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON registrations(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_player ON registrations(player_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_qr ON registrations(qr_code);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_court ON matches(court_id);
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_pools_tournament ON pools(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_courts_tournament ON courts(tournament_id);
  `);
  
  return db;
}

// Singleton for the database connection
let dbInstance = null;

function getDatabase(dbPath = null) {
  if (!dbInstance) {
    const defaultPath = path.join(__dirname, '..', '..', 'data', 'tennis.db');
    dbInstance = initializeDatabase(dbPath || defaultPath);
  }
  return dbInstance;
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Helper to create audit log
function createAuditLog(db, tableName, recordId, action, oldValues, newValues, userId = null, userRole = null) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, user_role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    tableName,
    recordId,
    action,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    userId,
    userRole
  );
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  createAuditLog
};
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbPath = path.join(dataDir, 'tennis.db');

function getDb(customPath) {
  const db = new Database(customPath || dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initializeDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      location TEXT,
      max_participants INTEGER DEFAULT 32,
      fee REAL DEFAULT 0,
      service_fee REAL DEFAULT 0,
      platform_fee_percent REAL DEFAULT 10,
      prize_pool REAL DEFAULT 0,
      registration_deadline TEXT,
      rules TEXT,
      bracket_type TEXT DEFAULT 'single_elimination',
      poster_url TEXT,
      status TEXT DEFAULT 'draft',
      late_registration_open INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      is_late INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(tournament_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS pool_players (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      seed_position INTEGER DEFAULT 0,
      FOREIGN KEY (pool_id) REFERENCES pools(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(pool_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      pool_id TEXT,
      round INTEGER DEFAULT 1,
      bracket_stage TEXT DEFAULT 'pool',
      player1_id TEXT,
      player2_id TEXT,
      scheduled_at TEXT,
      score_player1 INTEGER,
      score_player2 INTEGER,
      winner_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_staff (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_messages (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      recipient_type TEXT DEFAULT 'broadcast',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      entry_fee REAL NOT NULL DEFAULT 0,
      service_fee REAL NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      platform_amount REAL NOT NULL DEFAULT 0,
      host_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'held',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (registration_id) REFERENCES registrations(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS host_withdrawals (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (host_id) REFERENCES users(id)
    );
  `);
  return db;
}

module.exports = { getDb, initializeDb };
