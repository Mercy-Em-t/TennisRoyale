const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const createApp = require('../src/app');
const { initializeDatabase, closeDatabase } = require('../src/models/database');

describe('TennisRoyale API Tests', () => {
  let app;
  let db;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(() => {
    // Create test database
    db = initializeDatabase(testDbPath);
    app = createApp(db);
    // Mock broadcast function
    app.set('broadcast', () => {});
  });

  afterAll(() => {
    db.close();
    // Clean up test database
    const fs = require('fs');
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
    test('GET /health returns healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Tournaments API', () => {
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
      
      const res = await request(app).post(`/api/tournaments/${createRes.body.id}/open-registration`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('registration_open');
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
  });
});
