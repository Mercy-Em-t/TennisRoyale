const request = require('supertest');
const path = require('path');
const fs = require('fs');
const createApp = require('../src/app');
const { closeDb } = require('../src/models/database');

let app, db;
const TEST_DB = path.join(__dirname, 'test.db');

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  const result = createApp(TEST_DB);
  app = result.app;
  db = result.db;
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('Tournament Management System', () => {
  let tournamentId;
  let player1Id, player2Id, player3Id, player4Id;
  let poolAId, poolBId;

  describe('Tournament Lifecycle', () => {
    test('should create a tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Summer Open 2026' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Summer Open 2026');
      expect(res.body.status).toBe('draft');
      tournamentId = res.body.id;
    });

    test('should reject creating tournament without name', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .send({});
      expect(res.status).toBe(400);
    });

    test('should list tournaments', async () => {
      const res = await request(app).get('/api/tournaments');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    test('should get tournament by id', async () => {
      const res = await request(app).get(`/api/tournaments/${tournamentId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tournamentId);
    });

    test('should open registration', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/open-registration`);
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
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ playerName: 'Alice Smith', playerEmail: 'alice@test.com' });
      expect(res.status).toBe(409);
    });

    test('should list registrations', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/registrations`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(4);
    });

    test('should reject registration without required fields', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ playerName: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('Close Registration & Pool Management', () => {
    test('should close registration', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/close-registration`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('registration_closed');
    });

    test('should not register after registration closed', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ playerName: 'Eve New', playerEmail: 'eve@test.com' });
      expect(res.status).toBe(400);
    });

    test('should create pools with seeding', async () => {
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
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/pools`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].players.length).toBe(2);
    });

    test('should update pool player seeding (drag and drop)', async () => {
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
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/publish-pools`);
      expect(res.status).toBe(200);
      expect(res.body.pools_published).toBe(1);
    });

    test('should not modify pools after publishing', async () => {
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
    test('should generate round-robin matches', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/generate-matches`);
      expect(res.status).toBe(201);
      // 2 pools × 1 match each (2 players per pool = 1 match)
      expect(res.body.length).toBe(2);
    });

    test('should list matches', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/matches`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('should schedule a match', async () => {
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
      const completedMatch = matches.body.find(m => m.status === 'completed');

      const res = await request(app)
        .patch(`/api/tournaments/matches/${completedMatch.id}/score`)
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
    test('should open late registration', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/open-late-registration`);
      expect(res.status).toBe(200);
      expect(res.body.late_registration_open).toBe(1);
    });

    test('should allow late registration', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ playerName: 'Eve Late', playerEmail: 'eve@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.is_late).toBe(1);
    });

    test('should append late registration to pool and generate matches', async () => {
      const regs = await request(app)
        .get(`/api/tournaments/${tournamentId}/registrations`);
      const latePlayer = regs.body.find(r => r.is_late === 1);

      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/append-late-registrations`)
        .send({
          assignments: [{
            playerId: latePlayer.player_id,
            poolId: poolAId,
            seedPosition: 3
          }]
        });
      expect(res.status).toBe(201);
      expect(res.body.newMatches.length).toBeGreaterThan(0);
    });

    test('should close late registration', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/close-late-registration`);
      expect(res.status).toBe(200);
      expect(res.body.late_registration_open).toBe(0);
    });
  });

  describe('Bracket Advancement', () => {
    test('should score remaining pool matches for bracket advance', async () => {
      const matches = await request(app)
        .get(`/api/tournaments/${tournamentId}/matches`);
      const pendingMatches = matches.body.filter(m => m.status !== 'completed');

      for (const match of pendingMatches) {
        await request(app)
          .patch(`/api/tournaments/matches/${match.id}/score`)
          .send({ scorePlayer1: 6, scorePlayer2: 2 });
      }
    });

    test('should advance bracket to final', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/advance-bracket`)
        .send({ bracketStage: 'quarterfinal' });
      expect(res.status).toBe(201);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tournament Completion', () => {
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
    });

    test('should close tournament after all matches completed', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${tournamentId}/close`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    test('should export tournament data', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/export`);
      expect(res.status).toBe(200);
      expect(res.body.tournament).toBeTruthy();
      expect(res.body.registrations).toBeTruthy();
      expect(res.body.pools).toBeTruthy();
      expect(res.body.matches).toBeTruthy();
    });

    test('should archive tournament', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/archive`);
      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(1);
    });

    test('archived tournament should not appear in list', async () => {
      const res = await request(app).get('/api/tournaments');
      const found = res.body.find(t => t.id === tournamentId);
      expect(found).toBeUndefined();
    });
  });
});
