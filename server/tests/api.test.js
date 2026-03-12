const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { createDatabase } = require('../src/models/database');

// Use in-memory database for tests
let db;
let app;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';

  db = createDatabase(':memory:');

  const express = require('express');
  const cors = require('cors');

  app = express();
  app.use(cors());
  app.use(express.json());

  const createAuthRouter = require('../src/routes/auth');
  const createTournamentRouter = require('../src/routes/tournaments');
  const createPaymentRouter = require('../src/routes/payments');
  const createHostRouter = require('../src/routes/host');
  const createPlayerRouter = require('../src/routes/player');
  const createRefundRouter = require('../src/routes/refunds');
  const createAdminRouter = require('../src/routes/admin');

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/tournaments', createTournamentRouter(db));
  app.use('/api/payments', createPaymentRouter(db));
  app.use('/api/host', createHostRouter(db));
  app.use('/api/player', createPlayerRouter(db));
  app.use('/api/refunds', createRefundRouter(db));
  app.use('/api/admin', createAdminRouter(db));
});

afterAll(() => {
  if (db) db.close();
});

describe('Auth API', () => {
  test('POST /api/auth/signup - creates player', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'player@test.com', password: 'password123', name: 'Test Player' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('player');
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/signup - creates host', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'host@test.com', password: 'password123', name: 'Test Host', role: 'host' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('host');
  });

  test('POST /api/auth/signup - rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'player@test.com', password: 'password123', name: 'Dup' });

    expect(res.status).toBe(409);
  });

  test('POST /api/auth/signup - rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login - valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('Tournament API', () => {
  let hostToken;
  let playerToken;
  let tournamentId;

  beforeAll(async () => {
    const hostRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'host@test.com', password: 'password123' });
    hostToken = hostRes.body.token;

    const playerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.com', password: 'password123' });
    playerToken = playerRes.body.token;
  });

  test('POST /api/tournaments - host creates tournament', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Summer Open',
        description: 'Annual tennis tournament',
        sport: 'tennis',
        location: 'New York',
        entry_fee: 50,
        max_players: 16,
        start_date: '2026-06-01',
        end_date: '2026-06-03'
      });

    expect(res.status).toBe(201);
    expect(res.body.tournament.status).toBe('draft');
    tournamentId = res.body.tournament.id;
  });

  test('POST /api/tournaments - player cannot create', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ title: 'Unauthorized' });

    expect(res.status).toBe(403);
  });

  test('POST /api/tournaments/:id/publish', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/publish`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tournament.status).toBe('published');
    expect(res.body.registration_link).toBeDefined();
  });

  test('GET /api/tournaments - lists published', async () => {
    const res = await request(app).get('/api/tournaments');

    expect(res.status).toBe(200);
    expect(res.body.tournaments.length).toBeGreaterThan(0);
  });

  test('GET /api/tournaments/:id', async () => {
    const res = await request(app).get(`/api/tournaments/${tournamentId}`);

    expect(res.status).toBe(200);
    expect(res.body.tournament.title).toBe('Summer Open');
    expect(res.body.tournament.host_name).toBeDefined();
  });

  test('POST /api/tournaments/:id/register', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.registration.payment_status).toBe('pending');
  });

  test('POST /api/tournaments/:id/register - duplicate rejected', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(409);
  });
});

describe('Payment API', () => {
  let playerToken;
  let tournamentId;
  let paymentId;

  beforeAll(async () => {
    const playerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.com', password: 'password123' });
    playerToken = playerRes.body.token;

    const tournaments = db.prepare("SELECT id FROM tournaments WHERE title = 'Summer Open'").get();
    tournamentId = tournaments.id;
  });

  test('POST /api/payments/initiate', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ tournament_id: tournamentId });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50);
    expect(res.body.platform_fee).toBe(5);
    expect(res.body.host_amount).toBe(45);
    paymentId = res.body.payment_id;
  });

  test('POST /api/payments/webhook - success', async () => {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    const res = await request(app)
      .post('/api/payments/webhook')
      .send({
        transaction_reference: payment.transaction_reference,
        status: 'success'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Check registration updated
    const reg = db.prepare(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND player_id = ?'
    ).get(tournamentId, payment.user_id);
    expect(reg.payment_status).toBe('paid');

    // Check wallet created
    const wallet = db.prepare('SELECT * FROM platform_wallet WHERE tournament_id = ?').get(tournamentId);
    expect(wallet.total_collected).toBe(50);
    expect(wallet.platform_revenue).toBe(5);
    expect(wallet.host_balance).toBe(45);
  });
});

describe('Host Dashboard & Withdrawal', () => {
  let hostToken;

  beforeAll(async () => {
    const hostRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'host@test.com', password: 'password123' });
    hostToken = hostRes.body.token;
  });

  test('GET /api/host/dashboard', async () => {
    const res = await request(app)
      .get('/api/host/dashboard')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_tournaments).toBeGreaterThanOrEqual(1);
    expect(res.body.total_revenue).toBeGreaterThanOrEqual(0);
  });

  test('POST /api/host/withdraw - fails if not completed', async () => {
    const tournament = db.prepare("SELECT id FROM tournaments WHERE title = 'Summer Open'").get();

    const res = await request(app)
      .post('/api/host/withdraw')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ tournament_id: tournament.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('completed');
  });

  test('POST /api/host/withdraw - succeeds when completed', async () => {
    const tournament = db.prepare("SELECT id FROM tournaments WHERE title = 'Summer Open'").get();
    db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('completed', tournament.id);

    const res = await request(app)
      .post('/api/host/withdraw')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ tournament_id: tournament.id });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(45);
  });

  test('POST /api/host/withdraw - fails if already withdrawn', async () => {
    const tournament = db.prepare("SELECT id FROM tournaments WHERE title = 'Summer Open'").get();

    const res = await request(app)
      .post('/api/host/withdraw')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ tournament_id: tournament.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already');
  });
});

describe('Player Dashboard', () => {
  test('GET /api/player/tournaments', async () => {
    const playerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.com', password: 'password123' });

    const res = await request(app)
      .get('/api/player/tournaments')
      .set('Authorization', `Bearer ${playerRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.tournaments.length).toBeGreaterThan(0);
  });
});

describe('Admin Analytics', () => {
  test('GET /api/admin/revenue', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'host@test.com', password: 'password123' });

    const res = await request(app)
      .get('/api/admin/revenue')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.total_revenue).toBeGreaterThanOrEqual(0);
    expect(res.body.tournaments_hosted).toBeGreaterThanOrEqual(1);
  });
});

describe('Fee Calculation', () => {
  test('calculatePlatformFee', () => {
    const { calculatePlatformFee } = require('../src/utils/fees');

    const result = calculatePlatformFee(100);
    expect(result.platform_fee).toBe(10);
    expect(result.host_amount).toBe(90);
  });

  test('calculatePlatformFee - small amount', () => {
    const { calculatePlatformFee } = require('../src/utils/fees');

    const result = calculatePlatformFee(7.50);
    expect(result.platform_fee).toBe(0.75);
    expect(result.host_amount).toBe(6.75);
  });
});
