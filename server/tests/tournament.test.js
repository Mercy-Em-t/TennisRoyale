const request = require('supertest');
const path = require('path');
const fs = require('fs');
const createApp = require('../src/app');

let app;
const testDbPath = path.join(__dirname, 'test.db');

beforeAll(() => {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  app = createApp(testDbPath);
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
      .send({ name: 'Spring Open', date: '2026-04-01', location: 'Central Court', max_participants: 16 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Spring Open');
    expect(res.body.status).toBe('draft');
    tournamentId = res.body.id;
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
        .delete(`/api/tournaments/${tournamentId}/registrations/${registrationId}`);
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
        .send({ player1_id: player1Id, player2_id: player2Id, bracket_stage: 'pool' });
      expect(res.status).toBe(201);
      expect(res.body.player1_name).toBe('Bob Jones');
      matchId = res.body.id;
    });

    test('PUT matches/:id - records score', async () => {
      const res = await request(app)
        .put(`/api/tournaments/${tournamentId}/matches/${matchId}`)
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
        .delete(`/api/tournaments/${tournamentId}/staff/${staffId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Message API', () => {
    test('POST messages - sends a message', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/messages`)
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
    const res = await request(app).delete(`/api/tournaments/${tournamentId}`);
    expect(res.status).toBe(200);
  });
});
