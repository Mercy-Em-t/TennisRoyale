const Database = require('better-sqlite3');
const path = require('path');

function createDatabase(dbPath) {
  const db = new Database(dbPath || path.join(__dirname, '../../data/tournament.db'));

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single' CHECK(type IN ('single', 'team')),
      status TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'active', 'eliminated')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single_elimination' CHECK(type IN ('single_elimination', 'double_elimination', 'round_robin')),
      state TEXT NOT NULL DEFAULT 'registration_open' CHECK(state IN ('registration_open', 'in_progress', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tournament_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      team_a_id TEXT NOT NULL REFERENCES players(id),
      team_b_id TEXT NOT NULL REFERENCES players(id),
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'canceled')),
      round INTEGER NOT NULL DEFAULT 1,
      context_reason TEXT DEFAULT 'bracket',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      winner_id TEXT NOT NULL REFERENCES players(id),
      loser_id TEXT NOT NULL REFERENCES players(id),
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(match_id)
    );
  `);

  return db;
}

module.exports = { createDatabase };
