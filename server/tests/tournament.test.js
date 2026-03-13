```javascript
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { createApp } = require('../src/app');
const { initializeDb, getDb } = require('../src/models/database');

describe('TennisRoyale API Tests', () => {
  let app;
  let db;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(() => {
    // Create test database
    db = getDb(testDbPath);
    initializeDb(db);
    const result = createApp(testDbPath);
    app = result.app;
    // Mock broadcast function
    app.set('broadcast', () => { });
  });

  afterAll(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
  });

  beforeEach(() => {
    // Clear tables before each test
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM waivers;
      DELETE FROM payments;
      DELETE FROM matches;
      DELETE FROM pool_players;
      DELETE FROM pools;
      DELETE FROM courts;
      DELETE FROM registrations;
      DELETE FROM players;
      DELETE FROM tournaments;
`);
  });

  describe('Health Check', () => {
    test('GET /api/health returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Tournaments API', () => {
    let tournamentId;
    let player1Id, player2Id, player3Id, player4Id;
    let poolAId, poolBId;

    test('POST /api/tournaments creates a tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .send({
          name: 'Nairobi Open 2026',
          description: 'Annual tennis championship',
          location: 'Nairobi Tennis Club',
          start_date: '2026-03-15',
          end_date: '2026-03-17',
          max_players: 32,
          entry_fee: 1000
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Nairobi Open 2026');
      expect(res.body.status).toBe('draft');
      tournamentId = res.body.id;
    });

    test('GET /api/tournaments lists tournaments', async () => {
      // Create a tournament first
      await request(app).post('/api/tournaments').send({ name: 'Test Tournament' });

      const res = await request(app).get('/api/tournaments');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('POST /api/tournaments/:id/open-registration opens registration', async () => {
      const createRes = await request(app).post('/api/tournaments').send({ name: 'Test Tournament' });

      const res = await request(app).post(`/ api / tournaments / ${ createRes.body.id }/open-registration`);
expect(res.status).toBe(200);
expect(res.body.status).toBe('registration_open');
    });

test('should not open registration twice', async () => {
  const res = await request(app)
    .patch(`/api/tournaments/${tournamentId}/open-registration`);
  expect(res.status).toBe(400);
});
  });

describe('Player Registration', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Registration Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);
  });

  test('should register player 1', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.player_name).toBe('Alice Smith');
    player1Id = res.body.player_id;
  });

  test('should register player 2', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    expect(res.status).toBe(201);
    player2Id = res.body.player_id;
  });

  test('should register player 3', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    expect(res.status).toBe(201);
    player3Id = res.body.player_id;
  });

  test('should register player 4', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    expect(res.status).toBe(201);
    player4Id = res.body.player_id;
  });

  test('should not allow duplicate registration', async () => {
    await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' }); // Register once

    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' }); // Try to register again
    expect(res.status).toBe(409);
  });

  test('should list registrations', async () => {
    await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'P1', playerEmail: 'p1@test.com' });
    await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'P2', playerEmail: 'p2@test.com' });

    const res = await request(app)
      .get(`/api/tournaments/${tournamentId}/registrations`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('should reject registration without required fields', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Test' });
    expect(res.status).toBe(400);
  });
});

describe('Close Registration & Pool Management', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Pool Management Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;
  });

  test('should close registration', async () => {
    const res = await request(app)
      .patch(`/api/tournaments/${tournamentId}/close-registration`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('registration_closed');
  });

  test('should not register after registration closed', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Eve New', playerEmail: 'eve@test.com' });
    expect(res.status).toBe(400);
  });

  test('should create pools with seeding', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
    poolAId = res.body[0].id;
    poolBId = res.body[1].id;
  });

  test('should get pools', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;

    const res = await request(app)
      .get(`/api/tournaments/${tournamentId}/pools`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].players.length).toBe(2);
  });

  test('should update pool player seeding (drag and drop)', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;

    const res = await request(app)
      .put(`/api/tournaments/${tournamentId}/pools/${poolAId}/players`)
      .send({
        players: [
          { playerId: player2Id, seedPosition: 1 },
          { playerId: player1Id, seedPosition: 2 }
        ]
      });
    expect(res.status).toBe(200);
    expect(res.body.players[0].player_id).toBe(player2Id);
    expect(res.body.players[0].seed_position).toBe(1);
  });

  test('should publish pools', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          }
        ]
      });

    const res = await request(app)
      .patch(`/api/tournaments/${tournamentId}/publish-pools`);
    expect(res.status).toBe(200);
    expect(res.body.pools_published).toBe(1);
  });

  test('should not modify pools after publishing', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);

    const res = await request(app)
      .put(`/api/tournaments/${tournamentId}/pools/${poolAId}/players`)
      .send({
        players: [
          { playerId: player1Id, seedPosition: 1 },
          { playerId: player2Id, seedPosition: 2 }
        ]
      });
    expect(res.status).toBe(400);
  });
});

describe('Match Generation & Scheduling', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Match Gen Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;

    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    poolBId = createPoolsRes.body[1].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);
  });

  test('should generate round-robin matches', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/generate-matches`);
    expect(res.status).toBe(201);
    // 2 pools × 1 match each (2 players per pool = 1 match)
    expect(res.body.length).toBe(2);
  });

  test('should list matches', async () => {
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);
    const res = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('should schedule a match', async () => {
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const matchId = matches.body[0].id;

    const res = await request(app)
      .patch(`/api/tournaments/matches/${matchId}/schedule`)
      .send({ scheduledAt: '2026-07-15T10:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.scheduled_at).toBe('2026-07-15T10:00:00Z');
    expect(res.body.status).toBe('scheduled');
  });
});

describe('Match Scoring', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Match Scoring Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;

    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    poolBId = createPoolsRes.body[1].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);
  });

  test('should score a match', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const matchId = matches.body[0].id;

    const res = await request(app)
      .patch(`/api/tournaments/matches/${matchId}/score`)
      .send({ scorePlayer1: 6, scorePlayer2: 3 });
    expect(res.status).toBe(200);
    expect(res.body.score_player1).toBe(6);
    expect(res.body.score_player2).toBe(3);
    expect(res.body.status).toBe('completed');
    expect(res.body.winner_id).toBeTruthy();
  });

  test('should not score a completed match', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const matchId = matches.body[0].id;
    await request(app)
      .patch(`/api/tournaments/matches/${matchId}/score`)
      .send({ scorePlayer1: 6, scorePlayer2: 3 });

    const res = await request(app)
      .patch(`/api/tournaments/matches/${matchId}/score`)
      .send({ scorePlayer1: 4, scorePlayer2: 6 });
    expect(res.status).toBe(400);
  });

  test('should reject invalid scores', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const pendingMatch = matches.body.find(m => m.status !== 'completed');

    const res = await request(app)
      .patch(`/api/tournaments/matches/${pendingMatch.id}/score`)
      .send({ scorePlayer1: -1, scorePlayer2: 3 });
    expect(res.status).toBe(400);
  });

  test('should score the second match', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const pendingMatch = matches.body.find(m => m.status !== 'completed');

    const res = await request(app)
      .patch(`/api/tournaments/matches/${pendingMatch.id}/score`)
      .send({ scorePlayer1: 4, scorePlayer2: 6 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });
});

describe('Late Registration', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Late Reg Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;

    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    poolBId = createPoolsRes.body[1].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);
  });

  test('should open late registration', async () => {
    const res = await request(app)
      .patch(`/api/tournaments/${tournamentId}/open-late-registration`);
    expect(res.status).toBe(200);
    expect(res.body.late_registration_open).toBe(1);
  });

  test('should allow late registration', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/open-late-registration`);
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Eve Late', playerEmail: 'eve@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.is_late).toBe(1);
  });

  test('should append late registration to pool and generate matches', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/open-late-registration`);
    const lateRegRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/registrations`)
      .send({ playerName: 'Eve Late', playerEmail: 'eve@test.com' });
    const latePlayerId = lateRegRes.body.player_id;

    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/append-late-registrations`)
      .send({
        assignments: [{
          playerId: latePlayerId,
          poolId: poolAId,
          seedPosition: 3
        }]
      });
    expect(res.status).toBe(201);
    expect(res.body.newMatches.length).toBeGreaterThan(0);
  });

  test('should close late registration', async () => {
    await request(app).patch(`/api/tournaments/${tournamentId}/open-late-registration`);
    const res = await request(app)
      .patch(`/api/tournaments/${tournamentId}/close-late-registration`);
    expect(res.status).toBe(200);
    expect(res.body.late_registration_open).toBe(0);
  });
});

describe('Bracket Advancement', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Bracket Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;

    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    poolBId = createPoolsRes.body[1].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);
  });

  test('should score remaining pool matches for bracket advance', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const pendingMatches = matches.body.filter(m => m.status !== 'completed');

    for (const match of pendingMatches) {
      await request(app)
        .patch(`/api/tournaments/matches/${match.id}/score`)
        .send({ scorePlayer1: 6, scorePlayer2: 2 });
    }
    const updatedMatches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    expect(updatedMatches.body.every(m => m.status === 'completed')).toBe(true);
  });

  test('should advance bracket to final', async () => {
    // Score all pool matches first
    const matches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of matches.body) {
      await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 6, scorePlayer2: 2 });
    }

    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/advance-bracket`)
      .send({ bracketStage: 'quarterfinal' });
    expect(res.status).toBe(201);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Tournament Completion', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  beforeEach(async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Completion Test' });
    tournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${tournamentId}/open-registration`);

    const p1 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
    player1Id = p1.body.player_id;
    const p2 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Bob Jones', playerEmail: 'bob@test.com' });
    player2Id = p2.body.player_id;
    const p3 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Charlie Brown', playerEmail: 'charlie@test.com' });
    player3Id = p3.body.player_id;
    const p4 = await request(app).post(`/api/tournaments/${tournamentId}/registrations`).send({ playerName: 'Diana Prince', playerEmail: 'diana@test.com' });
    player4Id = p4.body.player_id;

    await request(app).patch(`/api/tournaments/${tournamentId}/close-registration`);
    const createPoolsRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/pools`)
      .send({
        pools: [
          {
            name: 'Pool A',
            players: [
              { playerId: player1Id, seedPosition: 1 },
              { playerId: player2Id, seedPosition: 2 }
            ]
          },
          {
            name: 'Pool B',
            players: [
              { playerId: player3Id, seedPosition: 1 },
              { playerId: player4Id, seedPosition: 2 }
            ]
          }
        ]
      });
    poolAId = createPoolsRes.body[0].id;
    poolBId = createPoolsRes.body[1].id;
    await request(app).patch(`/api/tournaments/${tournamentId}/publish-pools`);
    await request(app).post(`/api/tournaments/${tournamentId}/generate-matches`);

    // Score all pool matches
    const poolMatches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of poolMatches.body) {
      await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 6, scorePlayer2: 2 });
    }
    // Advance bracket to create bracket matches
    await request(app).post(`/api/tournaments/${tournamentId}/advance-bracket`).send({ bracketStage: 'quarterfinal' });
  });

  test('should score bracket matches', async () => {
    const matches = await request(app)
      .get(`/api/tournaments/${tournamentId}/matches`);
    const bracketMatches = matches.body.filter(
      m => m.bracket_stage !== 'pool' && m.status !== 'completed'
    );

    for (const match of bracketMatches) {
      await request(app)
        .patch(`/api/tournaments/matches/${match.id}/score`)
        .send({ scorePlayer1: 7, scorePlayer2: 5 });
    }
    const updatedMatches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    expect(updatedMatches.body.filter(m => m.bracket_stage !== 'pool').every(m => m.status === 'completed')).toBe(true);
  });

  test('should close tournament after all matches completed', async () => {
    // Ensure all matches are completed
    const matches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of matches.body) {
      if (match.status !== 'completed') {
        await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 7, scorePlayer2: 5 });
      }
    }

    const res = await request(app)
      .patch(`/api/tournaments/${tournamentId}/close`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  test('should export tournament data', async () => {
    // Ensure tournament is completed for export
    const matches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of matches.body) {
      if (match.status !== 'completed') {
        await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 7, scorePlayer2: 5 });
      }
    }
    await request(app).patch(`/api/tournaments/${tournamentId}/close`);

    const res = await request(app)
      .get(`/api/tournaments/${tournamentId}/export`);
    expect(res.status).toBe(200);
    expect(res.body.tournament).toBeTruthy();
    expect(res.body.registrations).toBeTruthy();
    expect(res.body.pools).toBeTruthy();
    expect(res.body.matches).toBeTruthy();
  });

  test('should archive tournament', async () => {
    // Ensure tournament is completed for archiving
    const matches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of matches.body) {
      if (match.status !== 'completed') {
        await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 7, scorePlayer2: 5 });
      }
    }
    await request(app).patch(`/api/tournaments/${tournamentId}/close`);

    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(1);
  });

  test('archived tournament should not appear in list', async () => {
    // Ensure tournament is completed and archived
    const matches = await request(app).get(`/api/tournaments/${tournamentId}/matches`);
    for (const match of matches.body) {
      if (match.status !== 'completed') {
        await request(app).patch(`/api/tournaments/matches/${match.id}/score`).send({ scorePlayer1: 7, scorePlayer2: 5 });
      }
    }
    await request(app).patch(`/api/tournaments/${tournamentId}/close`);
    await request(app).post(`/api/tournaments/${tournamentId}/archive`);

    const res = await request(app).get('/api/tournaments');
    const found = res.body.find(t => t.id === tournamentId);
    expect(found).toBeUndefined();
  });
});

describe('Detailed Tournament Creation', () => {
  let detailedTournamentId;

  test('should create a tournament with detailed fields', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .send({
        name: 'Grand Slam Open',
        date: '2026-08-15',
        location: 'Centre Court, London',
        max_participants: 32,
        fee: 50.00,
        poster_url: 'https://example.com/poster.jpg',
        certificate_enabled: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Grand Slam Open');
    expect(res.body.date).toBe('2026-08-15');
    expect(res.body.location).toBe('Centre Court, London');
    expect(res.body.max_participants).toBe(32);
    expect(res.body.fee).toBe(50);
    expect(res.body.poster_url).toBe('https://example.com/poster.jpg');
    expect(res.body.certificate_enabled).toBe(1);
    detailedTournamentId = res.body.id;
  });

  test('should update tournament details', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Temp Tourney', location: 'Temp Loc' });
    const tempTournamentId = createRes.body.id;

    const res = await request(app)
      .patch(`/api/tournaments/${tempTournamentId}`)
      .send({ name: 'Grand Slam Open 2026', fee: 75 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Grand Slam Open 2026');
    expect(res.body.fee).toBe(75);
    expect(res.body.location).toBe('Temp Loc');
  });

  test('should add a referee', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Staff Test' });
    const staffTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${staffTournamentId}/staff`)
      .send({ name: 'John Umpire', role: 'referee', email: 'john@ref.com' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('referee');
    expect(res.body.name).toBe('John Umpire');
  });

  test('should add a court marshal', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Staff Test 2' });
    const staffTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${staffTournamentId}/staff`)
      .send({ name: 'Jane Marshal', role: 'court_marshal' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('court_marshal');
  });

  test('should reject invalid staff role', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Staff Test 3' });
    const staffTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${staffTournamentId}/staff`)
      .send({ name: 'Bad Role', role: 'coach' });
    expect(res.status).toBe(400);
  });

  test('should list staff', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Staff List Test' });
    const staffTournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${staffTournamentId}/staff`).send({ name: 'John Umpire', role: 'referee' });
    await request(app).post(`/api/tournaments/${staffTournamentId}/staff`).send({ name: 'Jane Marshal', role: 'court_marshal' });

    const res = await request(app)
      .get(`/api/tournaments/${staffTournamentId}/staff`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('should delete a staff member', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Staff Delete Test' });
    const staffTournamentId = createRes.body.id;
    const addStaffRes = await request(app).post(`/api/tournaments/${staffTournamentId}/staff`).send({ name: 'John Umpire', role: 'referee' });
    const staffId = addStaffRes.body.id;

    const res = await request(app)
      .delete(`/api/tournaments/${staffTournamentId}/staff/${staffId}`);
    expect(res.status).toBe(200);
    const after = await request(app)
      .get(`/api/tournaments/${staffTournamentId}/staff`);
    expect(after.body.length).toBe(0);
  });

  test('should add a review', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Review Test' });
    const reviewTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${reviewTournamentId}/reviews`)
      .send({ author: 'Fan123', comment: 'Great tournament!', rating: 5 });
    expect(res.status).toBe(201);
    expect(res.body.author).toBe('Fan123');
    expect(res.body.rating).toBe(5);
  });

  test('should reject review without author', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Review Test 2' });
    const reviewTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${reviewTournamentId}/reviews`)
      .send({ comment: 'No author' });
    expect(res.status).toBe(400);
  });

  test('should list reviews', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Review List Test' });
    const reviewTournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${reviewTournamentId}/reviews`).send({ author: 'Fan123', comment: 'Great tournament!', rating: 5 });

    const res = await request(app)
      .get(`/api/tournaments/${reviewTournamentId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].comment).toBe('Great tournament!');
  });

  test('should send a broadcast message', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Message Test' });
    const messageTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${messageTournamentId}/messages`)
      .send({ subject: 'Welcome!', body: 'Welcome to the tournament.', isBroadcast: true });
    expect(res.status).toBe(201);
    expect(res.body.is_broadcast).toBe(1);
    expect(res.body.recipient_player_id).toBeNull();
  });

  test('should reject message without subject', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Message Test 2' });
    const messageTournamentId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tournaments/${messageTournamentId}/messages`)
      .send({ body: 'No subject', isBroadcast: true });
    expect(res.status).toBe(400);
  });

  test('should send a participant message', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Participant Message Test' });
    const messageTournamentId = createRes.body.id;
    // Register a player first
    await request(app).patch(`/api/tournaments/${messageTournamentId}/open-registration`);
    const reg = await request(app)
      .post(`/api/tournaments/${messageTournamentId}/registrations`)
      .send({ playerName: 'TestPlayer', playerEmail: 'testplayer@test.com' });
    const playerId = reg.body.player_id;

    const res = await request(app)
      .post(`/api/tournaments/${messageTournamentId}/messages`)
      .send({ subject: 'Your Schedule', body: 'You play at 10am.', recipientPlayerId: playerId });
    expect(res.status).toBe(201);
    expect(res.body.is_broadcast).toBe(0);
    expect(res.body.recipient_player_id).toBe(playerId);
  });

  test('should list messages', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Message List Test' });
    const messageTournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${messageTournamentId}/messages`).send({ subject: 'Welcome!', body: 'Welcome to the tournament.', isBroadcast: true });
    await request(app).patch(`/api/tournaments/${messageTournamentId}/open-registration`);
    const reg = await request(app).post(`/api/tournaments/${messageTournamentId}/registrations`).send({ playerName: 'TestPlayer', playerEmail: 'testplayer@test.com' });
    const playerId = reg.body.player_id;
    await request(app).post(`/api/tournaments/${messageTournamentId}/messages`).send({ subject: 'Your Schedule', body: 'You play at 10am.', recipientPlayerId: playerId });

    const res = await request(app)
      .get(`/api/tournaments/${messageTournamentId}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('should export JSON with new fields', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Export JSON Test' });
    const exportTournamentId = createRes.body.id;
    await request(app).post(`/api/tournaments/${exportTournamentId}/staff`).send({ name: 'John Umpire', role: 'referee' });
    await request(app).post(`/api/tournaments/${exportTournamentId}/reviews`).send({ author: 'Fan123', comment: 'Great tournament!', rating: 5 });
    await request(app).post(`/api/tournaments/${exportTournamentId}/messages`).send({ subject: 'Welcome!', body: 'Welcome to the tournament.', isBroadcast: true });

    const res = await request(app)
      .get(`/api/tournaments/${exportTournamentId}/export`);
    expect(res.status).toBe(200);
    expect(res.body.staff).toBeTruthy();
    expect(res.body.reviews).toBeTruthy();
    expect(res.body.messages).toBeTruthy();
  });

  test('should export as PDF', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Export PDF Test' });
    const exportTournamentId = createRes.body.id;

    const res = await request(app)
      .get(`/api/tournaments/${exportTournamentId}/export/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('should export as Excel', async () => {
    const createRes = await request(app).post('/api/tournaments').send({ name: 'Export Excel Test' });
    const exportTournamentId = createRes.body.id;

    const res = await request(app)
      .get(`/api/tournaments/${exportTournamentId}/export/excel`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
test('Tournament lifecycle flow works correctly', async () => {
  // Create
  const create = await request(app).post('/api/tournaments').send({ name: 'Lifecycle Test' });
  expect(create.body.status).toBe('draft');

  // Open registration
  const open = await request(app).post(`/api/tournaments/${create.body.id}/open-registration`);
  expect(open.body.status).toBe('registration_open');

  // Close registration
  const close = await request(app).post(`/api/tournaments/${create.body.id}/close-registration`);
  expect(close.body.status).toBe('registration_closed');

  // Start
  const start = await request(app).post(`/api/tournaments/${create.body.id}/start`);
  expect(start.body.status).toBe('in_progress');

  // Complete
  const complete = await request(app).post(`/api/tournaments/${create.body.id}/complete`);
  expect(complete.body.status).toBe('completed');

  // Archive
  const archive = await request(app).post(`/api/tournaments/${create.body.id}/archive`);
  expect(archive.body.status).toBe('archived');
});

describe('Players API', () => {
  test('POST /api/players creates a player', async () => {
    const res = await request(app)
      .post('/api/players')
      .send({
        first_name: 'John',
        last_name: 'Kamau',
        email: 'john.kamau@example.com',
        phone: '+254712345678',
        skill_level: 'intermediate'
      });

    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe('John');
    expect(res.body.email).toBe('john.kamau@example.com');
  });

  test('Prevents duplicate email registration', async () => {
    await request(app).post('/api/players').send({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    });

    const res = await request(app).post('/api/players').send({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'john@example.com'
    });

    expect(res.status).toBe(409);
  });
});

describe('Registrations API', () => {
  let tournament;
  let player;

  beforeEach(async () => {
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Test Tourney', entry_fee: 500 });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);
    tournament = (await request(app).get(`/api/tournaments/${tRes.body.id}`)).body;

    const pRes = await request(app).post('/api/players').send({
      first_name: 'Test',
      last_name: 'Player',
      email: `test${Date.now()}@example.com`
    });
    player = pRes.body;
  });

  test('POST /api/registrations registers a player', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .send({
        tournament_id: tournament.id,
        player_id: player.id
      });

    expect(res.status).toBe(201);
    expect(res.body.qr_code).toBeDefined();
    expect(res.body.payment_amount).toBe(500);
  });

  test('Prevents duplicate registration', async () => {
    await request(app).post('/api/registrations').send({
      tournament_id: tournament.id,
      player_id: player.id
    });

    const res = await request(app).post('/api/registrations').send({
      tournament_id: tournament.id,
      player_id: player.id
    });

    expect(res.status).toBe(409);
  });

  test('GET /api/registrations/by-qr/:qr_code finds registration', async () => {
    const regRes = await request(app).post('/api/registrations').send({
      tournament_id: tournament.id,
      player_id: player.id
    });

    const res = await request(app).get(`/api/registrations/by-qr/${regRes.body.qr_code}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(regRes.body.id);
  });
});

describe('Pools and Matches API', () => {
  let tournament;
  let registrations;

  beforeEach(async () => {
    // Reset registrations array for each test
    registrations = [];

    // Create tournament
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Pool Test' });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);
    tournament = (await request(app).get(`/api/tournaments/${tRes.body.id}`)).body;

    // Create and register 4 players
    for (let i = 0; i < 4; i++) {
      const pRes = await request(app).post('/api/players').send({
        first_name: `Player${i}`,
        last_name: 'Test',
        email: `player${i}_${Date.now()}@example.com`
      });

      const regRes = await request(app).post('/api/registrations').send({
        tournament_id: tournament.id,
        player_id: pRes.body.id,
        seed: i + 1
      });
      registrations.push(regRes.body);
    }
  });

  test('POST /api/pools/auto-generate creates pools', async () => {
    const res = await request(app)
      .post('/api/pools/auto-generate')
      .send({
        tournament_id: tournament.id,
        players_per_pool: 4
      });

    expect(res.status).toBe(201);
    expect(res.body.pools.length).toBeGreaterThan(0);
  });

  test('POST /api/matches/generate-pool-matches creates round-robin matches', async () => {
    // First create pools
    await request(app).post('/api/pools/auto-generate').send({
      tournament_id: tournament.id,
      players_per_pool: 4
    });

    const res = await request(app)
      .post('/api/matches/generate-pool-matches')
      .send({ tournament_id: tournament.id });

    expect(res.status).toBe(201);
    // 4 players = 6 matches in round-robin
    expect(res.body.match_count).toBe(6);
  });

  test('Live scoring updates match', async () => {
    // Create a match
    const matchRes = await request(app)
      .post('/api/matches')
      .send({
        tournament_id: tournament.id,
        player1_registration_id: registrations[0].id,
        player2_registration_id: registrations[1].id,
        bracket_stage: 'pool'
      });

    expect(matchRes.status).toBe(201);
    expect(matchRes.body.id).toBeDefined();

    // Start match
    const startRes = await request(app).post(`/api/matches/${matchRes.body.id}/start`);
    expect(startRes.status).toBe(200);

    // Score match
    const scoreRes = await request(app)
      .post(`/api/matches/${matchRes.body.id}/score`)
      .send({
        player1_score: '6-4,6-3',
        player2_score: '4-6,3-6',
        winner_registration_id: registrations[0].id
      });

    expect(scoreRes.status).toBe(200);
    expect(scoreRes.body.status).toBe('completed');
    expect(scoreRes.body.winner_registration_id).toBe(registrations[0].id);
  });
});

describe('Courts API', () => {
  let tournament;

  beforeEach(async () => {
    const res = await request(app).post('/api/tournaments').send({ name: 'Court Test' });
    tournament = res.body;
  });

  test('POST /api/courts creates a court', async () => {
    const res = await request(app)
      .post('/api/courts')
      .send({
        tournament_id: tournament.id,
        name: 'Center Court',
        surface: 'hard',
        location: 'Main Arena'
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Center Court');
  });

  test('POST /api/courts/bulk-create creates multiple courts', async () => {
    const res = await request(app)
      .post('/api/courts/bulk-create')
      .send({
        tournament_id: tournament.id,
        courts: [
          { name: 'Court 1', surface: 'hard' },
          { name: 'Court 2', surface: 'clay' },
          { name: 'Court 3', surface: 'grass' }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.courts.length).toBe(3);
  });
});

describe('Check-in API', () => {
  let tournament;
  let player;
  let registration;

  beforeEach(async () => {
    // Create tournament
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Check-in Test', entry_fee: 0 });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);
    tournament = (await request(app).get(`/api/tournaments/${tRes.body.id}`)).body;

    // Create player
    const pRes = await request(app).post('/api/players').send({
      first_name: 'Checkin',
      last_name: 'Player',
      email: `checkin${Date.now()}@example.com`
    });
    player = pRes.body;

    // Register
    const regRes = await request(app).post('/api/registrations').send({
      tournament_id: tournament.id,
      player_id: player.id
    });
    registration = regRes.body;

    // Waive payment
    await request(app).post('/api/payments/waive').send({
      registration_id: registration.id,
      reason: 'Test'
    });
  });

  test('POST /api/checkin/scan checks in player via QR', async () => {
    const res = await request(app)
      .post('/api/checkin/scan')
      .send({ qr_code: registration.qr_code });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Check-in successful');
    expect(res.body.registration.status).toBe('checked_in');
  });

  test('POST /api/checkin/manual checks in player manually', async () => {
    const res = await request(app)
      .post('/api/checkin/manual')
      .send({ registration_id: registration.id });

    expect(res.status).toBe(200);
    expect(res.body.registration.status).toBe('checked_in');
  });

  test('GET /api/checkin/status/:tournament_id returns check-in status', async () => {
    const res = await request(app).get(`/api/checkin/status/${tournament.id}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });

  test('GET /api/checkin/generate-qr/:registration_id generates QR code', async () => {
    const res = await request(app)
      .get(`/api/checkin/generate-qr/${registration.id}?format=dataurl`);

    expect(res.status).toBe(200);
    expect(res.body.data_url).toContain('data:image/png;base64');
  });
});

describe('Payments API', () => {
  let tournament;
  let registration;

  beforeEach(async () => {
    // Create tournament with entry fee
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Payment Test', entry_fee: 1000 });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);
    tournament = (await request(app).get(`/api/tournaments/${tRes.body.id}`)).body;

    // Create player and register
    const pRes = await request(app).post('/api/players').send({
      first_name: 'Payment',
      last_name: 'Player',
      email: `payment${Date.now()}@example.com`
    });

    const regRes = await request(app).post('/api/registrations').send({
      tournament_id: tournament.id,
      player_id: pRes.body.id
    });
    registration = regRes.body;
  });

  test('POST /api/payments records a payment', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({
        registration_id: registration.id,
        amount: 1000,
        payment_method: 'mpesa',
        transaction_id: 'MPESA123456'
      });

    expect(res.status).toBe(201);
    expect(res.body.receipt_number).toMatch(/^RCP-/);
    expect(res.body.amount).toBe(1000);
  });

  test('POST /api/payments/:id/refund processes refund', async () => {
    // First create payment
    const payRes = await request(app).post('/api/payments').send({
      registration_id: registration.id,
      amount: 1000,
      payment_method: 'mpesa'
    });

    // Then refund
    const res = await request(app)
      .post(`/api/payments/${payRes.body.id}/refund`)
      .send({ reason: 'Player cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.refund.receipt_number).toMatch(/^REF-/);
  });

  test('GET /api/payments/tournament/:id/summary returns summary', async () => {
    await request(app).post('/api/payments').send({
      registration_id: registration.id,
      amount: 1000,
      payment_method: 'cash'
    });

    const res = await request(app).get(`/api/payments/tournament/${tournament.id}/summary`);
    expect(res.status).toBe(200);
    expect(res.body.summary.total_collected).toBe(1000);
  });
});

describe('Waivers API', () => {
  let registration;

  beforeEach(async () => {
    // Create tournament and registration
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Waiver Test' });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);

    const pRes = await request(app).post('/api/players').send({
      first_name: 'Waiver',
      last_name: 'Player',
      email: `waiver${Date.now()}@example.com`
    });

    const regRes = await request(app).post('/api/registrations').send({
      tournament_id: tRes.body.id,
      player_id: pRes.body.id
    });
    registration = regRes.body;
  });

  test('POST /api/waivers creates a waiver', async () => {
    const res = await request(app)
      .post('/api/waivers')
      .send({
        registration_id: registration.id,
        waiver_type: 'liability',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+254700000000'
      });

    expect(res.status).toBe(201);
    expect(res.body.waiver_type).toBe('liability');
  });

  test('POST /api/waivers/:id/sign signs a waiver', async () => {
    // Create waiver
    const createRes = await request(app).post('/api/waivers').send({
      registration_id: registration.id,
      waiver_type: 'liability'
    });

    // Sign waiver
    const res = await request(app)
      .post(`/api/waivers/${createRes.body.id}/sign`)
      .send({
        signature_data: 'base64signaturedata',
        emergency_contact_name: 'Contact Person',
        emergency_contact_phone: '+254711111111'
      });

    expect(res.status).toBe(200);
    expect(res.body.waiver.signed).toBe(1);
  });
});

describe('Exports API', () => {
  let tournament;

  beforeEach(async () => {
    // Create tournament with some data
    const tRes = await request(app).post('/api/tournaments').send({
      name: 'Export Test',
      location: 'Test Venue'
    });
    tournament = tRes.body;
  });

  test('GET /api/exports/tournament/:id exports full tournament data', async () => {
    const res = await request(app).get(`/api/exports/tournament/${tournament.id}`);
    expect(res.status).toBe(200);
    expect(res.body.tournament).toBeDefined();
    expect(res.body.summary).toBeDefined();
  });

  test('GET /api/exports/tournament/:id/registrations?format=csv exports CSV', async () => {
    const res = await request(app).get(`/api/exports/tournament/${tournament.id}/registrations?format=csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});

describe('Audit API', () => {
  test('GET /api/audit returns audit logs', async () => {
    // Create something to generate audit logs
    await request(app).post('/api/tournaments').send({ name: 'Audit Test' });

    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/audit/stats/summary returns statistics', async () => {
    const res = await request(app).get('/api/audit/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeDefined();
  });
});

describe('Bracket Generation', () => {
  test('Generates bracket from pool results', async () => {
    // Create tournament
    const tRes = await request(app).post('/api/tournaments').send({ name: 'Bracket Test' });
    await request(app).post(`/api/tournaments/${tRes.body.id}/open-registration`);
    const tournament = tRes.body;

    // Create 8 players and register them
    const registrations = [];
    for (let i = 0; i < 8; i++) {
      const pRes = await request(app).post('/api/players').send({
        first_name: `BracketPlayer${i}`,
        last_name: 'Test',
        email: `bracket${i}_${Date.now()}@example.com`
      });

      const regRes = await request(app).post('/api/registrations').send({
        tournament_id: tournament.id,
        player_id: pRes.body.id,
        seed: i + 1
      });
      registrations.push(regRes.body);
    }

    // Create pools
    await request(app).post('/api/pools/auto-generate').send({
      tournament_id: tournament.id,
      players_per_pool: 4
    });

    // Generate pool matches
    await request(app).post('/api/matches/generate-pool-matches').send({
      tournament_id: tournament.id
    });

    // Complete all pool matches (simulate winners)
    const matches = (await request(app).get(`/api/matches?tournament_id=${tournament.id}`)).body;

    for (const match of matches) {
      await request(app).post(`/api/matches/${match.id}/start`);
      await request(app).post(`/api/matches/${match.id}/score`).send({
        player1_score: '6-4',
        player2_score: '4-6',
        winner_registration_id: match.player1_registration_id
      });
    }

    // Generate bracket
    const bracketRes = await request(app)
      .post('/api/matches/generate-bracket')
      .send({
        tournament_id: tournament.id,
        bracket_size: 4
      });

    expect(bracketRes.status).toBe(201);
    expect(bracketRes.body.match_ids.length).toBe(2); // 4 players = 2 semifinal matches
  });
  const path = require('path');
  const fs = require('fs');
  const createApp = require('../src/app');

  let app;
  let hostToken;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    app = createApp(testDbPath);

    // Register a host user for authenticated tests
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Host', email: 'host@test.com', password: 'password123', role: 'host' });
    hostToken = res.body.token;
  });

  afterAll(() => {
    if (app.db) app.db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  describe('Tournament API', () => {
    let tournamentId;

    test('POST /api/tournaments - creates a tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ name: 'Spring Open', date: '2026-04-01', location: 'Central Court', max_participants: 16 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Spring Open');
      expect(res.body.status).toBe('draft');
      tournamentId = res.body.id;
    });

    test('POST /api/tournaments - rejects unauthenticated', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(401);
    });

    test('GET /api/tournaments - lists tournaments', async () => {
      const res = await request(app).get('/api/tournaments');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/tournaments/:id - returns tournament with stats', async () => {
      const res = await request(app).get(`/api/tournaments/${tournamentId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Spring Open');
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.registrations).toBe(0);
    });

    test('PUT /api/tournaments/:id - updates tournament status', async () => {
      const res = await request(app)
        .put(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'registration_open' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('registration_open');
    });

    describe('Registration API', () => {
      let registrationId;
      let playerId;

      test('POST registrations - registers a player', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/registrations`)
          .send({ name: 'Alice Smith', email: 'alice@example.com' });
        expect(res.status).toBe(201);
        expect(res.body.player_name).toBe('Alice Smith');
        registrationId = res.body.id;
        playerId = res.body.player_id;
      });

      test('GET registrations - lists registrations', async () => {
        const res = await request(app)
          .get(`/api/tournaments/${tournamentId}/registrations`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
      });

      test('POST registrations - prevents duplicate registration', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/registrations`)
          .send({ name: 'Alice Smith', email: 'alice@example.com' });
        expect(res.status).toBe(400);
      });

      test('DELETE registrations/:id - removes registration', async () => {
        const res = await request(app)
          .delete(`/api/tournaments/${tournamentId}/registrations/${registrationId}`)
          .set('Authorization', `Bearer ${hostToken}`);
        expect(res.status).toBe(200);
      });
    });

    describe('Match API', () => {
      let matchId;
      let player1Id, player2Id;

      beforeAll(async () => {
        // Register two players
        const r1 = await request(app)
          .post(`/api/tournaments/${tournamentId}/registrations`)
          .send({ name: 'Bob Jones', email: 'bob@example.com' });
        player1Id = r1.body.player_id;

        const r2 = await request(app)
          .post(`/api/tournaments/${tournamentId}/registrations`)
          .send({ name: 'Charlie Brown', email: 'charlie@example.com' });
        player2Id = r2.body.player_id;
      });

      test('POST matches - creates a match', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/matches`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ player1_id: player1Id, player2_id: player2Id, bracket_stage: 'pool' });
        expect(res.status).toBe(201);
        expect(res.body.player1_name).toBe('Bob Jones');
        matchId = res.body.id;
      });

      test('PUT matches/:id - records score', async () => {
        const res = await request(app)
          .put(`/api/tournaments/${tournamentId}/matches/${matchId}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ score_player1: 6, score_player2: 3 });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('completed');
        expect(res.body.winner_name).toBe('Bob Jones');
      });

      test('GET matches - lists matches', async () => {
        const res = await request(app)
          .get(`/api/tournaments/${tournamentId}/matches`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
      });
    });

    describe('Pool API', () => {
      let poolId;

      test('POST pools - creates a pool', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/pools`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ name: 'Pool A' });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Pool A');
        poolId = res.body.id;
      });

      test('GET pools - lists pools', async () => {
        const res = await request(app)
          .get(`/api/tournaments/${tournamentId}/pools`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
      });
    });

    describe('Staff API', () => {
      let staffId;

      test('POST staff - adds staff member', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/staff`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ name: 'John Referee', role: 'referee', email: 'john@example.com' });
        expect(res.status).toBe(201);
        expect(res.body.role).toBe('referee');
        staffId = res.body.id;
      });

      test('GET staff - lists staff', async () => {
        const res = await request(app)
          .get(`/api/tournaments/${tournamentId}/staff`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
      });

      test('DELETE staff/:id - removes staff', async () => {
        const res = await request(app)
          .delete(`/api/tournaments/${tournamentId}/staff/${staffId}`)
          .set('Authorization', `Bearer ${hostToken}`);
        expect(res.status).toBe(200);
      });
    });

    describe('Message API', () => {
      test('POST messages - sends a message', async () => {
        const res = await request(app)
          .post(`/api/tournaments/${tournamentId}/messages`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ subject: 'Welcome', body: 'Welcome to Spring Open!' });
        expect(res.status).toBe(201);
        expect(res.body.subject).toBe('Welcome');
      });

      test('GET messages - lists messages', async () => {
        const res = await request(app)
          .get(`/api/tournaments/${tournamentId}/messages`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
      });
    });

    test('DELETE /api/tournaments/:id - deletes tournament', async () => {
      const res = await request(app)
        .delete(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth API', () => {
    test('POST /api/auth/register - creates a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Player One', email: 'player1@test.com', password: 'pass123', role: 'player' });
      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe('Player One');
      expect(res.body.user.role).toBe('player');
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/register - rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Player One', email: 'player1@test.com', password: 'pass123', role: 'player' });
      expect(res.status).toBe(400);
    });

    test('POST /api/auth/login - authenticates user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'player1@test.com', password: 'pass123' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('player');
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login - rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'player1@test.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    test('GET /api/auth/me - returns current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Test Host');
      expect(res.body.user.role).toBe('host');
    });

    test('GET /api/auth/me - rejects unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Role-based access control', () => {
    let playerToken;
    let refereeToken;

    beforeAll(async () => {
      const playerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'RBAC Player', email: 'rbac-player@test.com', password: 'pass123', role: 'player' });
      playerToken = playerRes.body.token;

      const refereeRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'RBAC Referee', email: 'rbac-referee@test.com', password: 'pass123', role: 'referee' });
      refereeToken = refereeRes.body.token;
    });

    test('player cannot create tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(403);
    });

    test('referee cannot create tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(403);
    });

    test('referee can score a match', async () => {
      // Host creates tournament and match
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ name: 'RBAC Test Tournament' });
      const tid = tRes.body.id;

      await request(app)
        .put(`/api/tournaments/${tid}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'registration_open' });

      const r1 = await request(app)
        .post(`/api/tournaments/${tid}/registrations`)
        .send({ name: 'P1', email: 'rbac-p1@test.com' });
      const r2 = await request(app)
        .post(`/api/tournaments/${tid}/registrations`)
        .send({ name: 'P2', email: 'rbac-p2@test.com' });

      const mRes = await request(app)
        .post(`/api/tournaments/${tid}/matches`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ player1_id: r1.body.player_id, player2_id: r2.body.player_id });

      // Referee scores the match
      const scoreRes = await request(app)
        .put(`/api/tournaments/${tid}/matches/${mRes.body.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ score_player1: 6, score_player2: 4 });
      expect(scoreRes.status).toBe(200);
      expect(scoreRes.body.status).toBe('completed');
    });

    test('player cannot score a match', async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ name: 'Player Score Test' });
      const tid = tRes.body.id;

      await request(app)
        .put(`/api/tournaments/${tid}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'registration_open' });

      const r1 = await request(app)
        .post(`/api/tournaments/${tid}/registrations`)
        .send({ name: 'PS1', email: 'ps1@test.com' });
      const r2 = await request(app)
        .post(`/api/tournaments/${tid}/registrations`)
        .send({ name: 'PS2', email: 'ps2@test.com' });

      const mRes = await request(app)
        .post(`/api/tournaments/${tid}/matches`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ player1_id: r1.body.player_id, player2_id: r2.body.player_id });

      const scoreRes = await request(app)
        .put(`/api/tournaments/${tid}/matches/${mRes.body.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ score_player1: 6, score_player2: 4 });
      expect(scoreRes.status).toBe(403);
    });
  });
