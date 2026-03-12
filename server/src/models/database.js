const Database = require('better-sqlite3');
const path = require('path');

function createDatabase(dbPath) {
  const db = new Database(dbPath || path.join(__dirname, '../../data/tennis.db'));

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player', 'host')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      phone TEXT,
      country TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS host_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      organization_name TEXT,
      phone TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sport TEXT NOT NULL DEFAULT 'tennis',
      location TEXT,
      start_date TEXT,
      end_date TEXT,
      registration_deadline TEXT,
      entry_fee REAL NOT NULL DEFAULT 0,
      max_players INTEGER NOT NULL DEFAULT 32,
      current_players INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_sport ON tournaments(sport);
    CREATE INDEX IF NOT EXISTS idx_tournaments_location ON tournaments(location);
    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

    CREATE TABLE IF NOT EXISTS tournament_registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(tournament_id, player_id)
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
      user_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      amount REAL NOT NULL,
      platform_fee REAL NOT NULL,
      host_amount REAL NOT NULL,
      payment_provider TEXT,
      transaction_reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed', 'refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_wallet (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL UNIQUE,
      total_collected REAL NOT NULL DEFAULT 0,
      platform_revenue REAL NOT NULL DEFAULT 0,
      host_balance REAL NOT NULL DEFAULT 0,
      released_to_host INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
  `);

  return db;
}

module.exports = { createDatabase };
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
