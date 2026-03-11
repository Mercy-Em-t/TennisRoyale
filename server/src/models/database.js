const Database = require('better-sqlite3');
const path = require('path');
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
  `);
  return db;
}

module.exports = { getDb, initializeDb };
