const request = require('supertest');
const path = require('path');
const fs = require('fs');
const createApp = require('../src/app');

let app;
let hostToken;
let hostUserId;
const testDbPath = path.join(__dirname, 'test-payments.db');

beforeAll(async () => {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  app = createApp(testDbPath);

  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Payment Host', email: 'payhost@test.com', password: 'password123', role: 'host' });
  hostToken = res.body.token;
  hostUserId = res.body.user.id;
});

afterAll(() => {
  if (app.db) app.db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

describe('Payment System', () => {
  let tournamentId;

  test('creates tournament with fee, service_fee, prize_pool, rules, bracket_type', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: 'Paid Tournament',
        date: '2026-06-01',
        location: 'Main Court',
        max_participants: 32,
        fee: 2000,
        service_fee: 100,
        prize_pool: 50000,
        registration_deadline: '2026-05-28',
        rules: 'Best of 3 sets. Tiebreak at 6-6.',
        bracket_type: 'single_elimination'
      });
    expect(res.status).toBe(201);
    expect(res.body.fee).toBe(2000);
    expect(res.body.service_fee).toBe(100);
    expect(res.body.prize_pool).toBe(50000);
    expect(res.body.rules).toBe('Best of 3 sets. Tiebreak at 6-6.');
    expect(res.body.bracket_type).toBe('single_elimination');
    expect(res.body.registration_deadline).toBe('2026-05-28');
    expect(res.body.host_name).toBe('Payment Host');
    tournamentId = res.body.id;
  });

  test('GET tournament includes host_name and earnings', async () => {
    const res = await request(app).get(`/api/tournaments/${tournamentId}`);
    expect(res.status).toBe(200);
    expect(res.body.host_name).toBe('Payment Host');
    expect(res.body.earnings).toBeDefined();
    expect(res.body.earnings.total_collected).toBe(0);
    expect(res.body.earnings.host_total).toBe(0);
    expect(res.body.earnings.available).toBe(0);
  });

  test('GET tournaments list includes host_name', async () => {
    const res = await request(app).get('/api/tournaments');
    expect(res.status).toBe(200);
    expect(res.body[0].host_name).toBe('Payment Host');
  });

  describe('Payment on registration', () => {
    beforeAll(async () => {
      await request(app)
        .put(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'registration_open' });
    });

    test('registration creates payment record with correct fee split', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ name: 'Paying Player', email: 'payer@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.entry_fee).toBe(2000);
      expect(res.body.payment.service_fee).toBe(100);
      expect(res.body.payment.total_paid).toBe(2100);
      // Platform gets 10% of entry fee (200) + service fee (100) = 300
      expect(res.body.payment.platform_amount).toBe(300);
      // Host gets 90% of entry fee = 1800
      expect(res.body.payment.host_amount).toBe(1800);
      expect(res.body.payment.status).toBe('held');
    });

    test('second registration also creates payment', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/registrations`)
        .send({ name: 'Second Player', email: 'second@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.total_paid).toBe(2100);
    });
  });

  describe('Payments API', () => {
    test('GET payments lists all payments', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/payments`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].player_name).toBeDefined();
    });

    test('GET earnings shows correct totals', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/payments/earnings`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res.status).toBe(200);
      // 2 players × 2100 total_paid = 4200
      expect(res.body.total_collected).toBe(4200);
      // 2 × 300 platform = 600
      expect(res.body.platform_total).toBe(600);
      // 2 × 1800 host = 3600
      expect(res.body.host_total).toBe(3600);
      expect(res.body.available).toBe(3600);
      expect(res.body.withdrawn).toBe(0);
      expect(res.body.can_withdraw).toBe(false); // tournament not completed
    });
  });

  describe('Escrow & Withdrawal', () => {
    test('cannot withdraw before tournament completes (escrow)', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/payments/withdraw`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ amount: 1000 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('escrow');
    });

    test('can withdraw after tournament completes', async () => {
      // Complete the tournament
      await request(app)
        .put(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'completed' });

      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/payments/withdraw`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ amount: 1800 });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1800);
      expect(res.body.status).toBe('completed');
    });

    test('cannot withdraw more than available balance', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournamentId}/payments/withdraw`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ amount: 5000 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient');
    });

    test('earnings reflect withdrawal', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${tournamentId}/payments/earnings`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res.status).toBe(200);
      expect(res.body.withdrawn).toBe(1800);
      expect(res.body.available).toBe(1800); // 3600 - 1800
      expect(res.body.can_withdraw).toBe(true);
    });
  });

  describe('Free tournament has no payments', () => {
    let freeTournamentId;

    test('registration on free tournament has no payment', async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ name: 'Free Tournament', fee: 0 });
      freeTournamentId = tRes.body.id;

      await request(app)
        .put(`/api/tournaments/${freeTournamentId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'registration_open' });

      const res = await request(app)
        .post(`/api/tournaments/${freeTournamentId}/registrations`)
        .send({ name: 'Free Player', email: 'free@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.payment).toBeNull();
    });
  });
});
