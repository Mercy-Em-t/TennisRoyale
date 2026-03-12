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
