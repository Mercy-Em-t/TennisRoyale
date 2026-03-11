const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb(dbPath) {
  if (db) return db;
  const dir = path.dirname(dbPath || path.join(__dirname, '..', 'data', 'tennis.db'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath || path.join(__dirname, '..', 'data', 'tennis.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeDb(db);
  return db;
}

function initializeDb(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      location TEXT,
      max_participants INTEGER,
      fee REAL DEFAULT 0,
      poster_url TEXT,
      certificate_enabled INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      late_registration_open INTEGER NOT NULL DEFAULT 0,
      pools_published INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      is_late INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(tournament_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS pool_players (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      seed_position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (pool_id) REFERENCES pools(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(pool_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      pool_id TEXT,
      round INTEGER NOT NULL DEFAULT 1,
      bracket_stage TEXT DEFAULT 'pool',
      player1_id TEXT,
      player2_id TEXT,
      scheduled_at TEXT,
      score_player1 INTEGER,
      score_player2 INTEGER,
      winner_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (pool_id) REFERENCES pools(id),
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id),
      FOREIGN KEY (winner_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_staff (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_reviews (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      author TEXT NOT NULL,
      comment TEXT NOT NULL,
      rating INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_messages (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      recipient_player_id TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_broadcast INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (recipient_player_id) REFERENCES players(id)
    );
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, initializeDb };
