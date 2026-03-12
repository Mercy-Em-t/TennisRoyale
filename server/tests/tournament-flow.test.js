const { createApp } = require('../src/app');
const path = require('path');
const fs = require('fs');
const http = require('http');

let app;
let server;
let baseUrl;

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

beforeAll((done) => {
  const dbPath = path.join('/tmp', `test-${Date.now()}.db`);
  app = createApp(dbPath);
  server = app.listen(0, () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    done();
  });
});

afterAll((done) => {
  if (app.db) app.db.close();
  server.close(done);
});

describe('Full Tournament Flow', () => {
  let tournamentId;
  let playerAId;
  let playerBId;
  let playerCId;
  let matchId;

  test('Step 1: Create players', async () => {
    const resA = await request('POST', '/api/players', { name: 'Alice' });
    expect(resA.status).toBe(201);
    expect(resA.body.status).toBe('registered');
    playerAId = resA.body.id;

    const resB = await request('POST', '/api/players', { name: 'Bob' });
    expect(resB.status).toBe(201);
    playerBId = resB.body.id;

    const resC = await request('POST', '/api/players', { name: 'Charlie' });
    expect(resC.status).toBe(201);
    playerCId = resC.body.id;
  });

  test('Step 2: Create a tournament', async () => {
    const res = await request('POST', '/api/tournaments', { name: 'Autumn Cup', type: 'single_elimination' });
    expect(res.status).toBe(201);
    expect(res.body.state).toBe('registration_open');
    tournamentId = res.body.id;
  });

  test('Step 3: Register players to tournament', async () => {
    const resA = await request('POST', `/api/tournaments/${tournamentId}/register`, { player_id: playerAId });
    expect(resA.status).toBe(201);

    const resB = await request('POST', `/api/tournaments/${tournamentId}/register`, { player_id: playerBId });
    expect(resB.status).toBe(201);

    const resC = await request('POST', `/api/tournaments/${tournamentId}/register`, { player_id: playerCId });
    expect(resC.status).toBe(201);
  });

  test('Step 3b: Cannot register same player twice', async () => {
    const res = await request('POST', `/api/tournaments/${tournamentId}/register`, { player_id: playerAId });
    expect(res.status).toBe(409);
  });

  test('Step 4: Start tournament (transition to in_progress)', async () => {
    const res = await request('PATCH', `/api/tournaments/${tournamentId}/state`, { state: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('in_progress');
  });

  test('Step 4b: Cannot register when tournament is in_progress', async () => {
    const newPlayer = await request('POST', '/api/players', { name: 'Dave' });
    const res = await request('POST', `/api/tournaments/${tournamentId}/register`, { player_id: newPlayer.body.id });
    expect(res.status).toBe(400);
  });

  test('Step 5: Create first match (Round 1: Alice vs Bob)', async () => {
    const res = await request('POST', '/api/matches', {
      tournament_id: tournamentId,
      team_a_id: playerAId,
      team_b_id: playerBId,
      round: 1,
      context_reason: 'bracket',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('scheduled');
    matchId = res.body.id;
  });

  test('Step 6: Start the match (scheduled → in_progress)', async () => {
    const res = await request('PATCH', `/api/matches/${matchId}/status`, { status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  test('Step 7: Record match result (Alice wins)', async () => {
    const res = await request('POST', `/api/matches/${matchId}/result`, { winner_id: playerAId });
    expect(res.status).toBe(201);
    expect(res.body.result.winner_id).toBe(playerAId);
    expect(res.body.result.loser_id).toBe(playerBId);
    expect(res.body.match.status).toBe('completed');
  });

  test('Step 8: Check player states after match', async () => {
    const winner = await request('GET', `/api/players/${playerAId}`);
    expect(winner.body.status).toBe('registered'); // ready for next match

    const loser = await request('GET', `/api/players/${playerBId}`);
    expect(loser.body.status).toBe('eliminated');
  });

  test('Step 9: Create next match (Round 2: Alice vs Charlie) - match repeats', async () => {
    const res = await request('POST', '/api/matches', {
      tournament_id: tournamentId,
      team_a_id: playerAId,
      team_b_id: playerCId,
      round: 2,
      context_reason: 'bracket',
    });
    expect(res.status).toBe(201);
    expect(res.body.round).toBe(2);
    matchId = res.body.id;
  });

  test('Step 10: Play second match (Alice vs Charlie)', async () => {
    await request('PATCH', `/api/matches/${matchId}/status`, { status: 'in_progress' });
    const res = await request('POST', `/api/matches/${matchId}/result`, { winner_id: playerAId });
    expect(res.status).toBe(201);
    expect(res.body.result.winner_id).toBe(playerAId);
  });

  test('Step 11: Complete tournament', async () => {
    const res = await request('PATCH', `/api/tournaments/${tournamentId}/state`, { state: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('completed');
  });

  test('Step 12: Get tournament progression (all results)', async () => {
    const res = await request('GET', `/api/matches/tournament/${tournamentId}/results`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].round).toBe(1);
    expect(res.body[1].round).toBe(2);
  });

  test('Step 13: Get full tournament details', async () => {
    const res = await request('GET', `/api/tournaments/${tournamentId}`);
    expect(res.status).toBe(200);
    expect(res.body.players).toHaveLength(3);
    expect(res.body.matches).toHaveLength(2);
    expect(res.body.state).toBe('completed');
  });
});

describe('Validation Tests', () => {
  test('Cannot create player without name', async () => {
    const res = await request('POST', '/api/players', {});
    expect(res.status).toBe(400);
  });

  test('Cannot create tournament without name', async () => {
    const res = await request('POST', '/api/tournaments', {});
    expect(res.status).toBe(400);
  });

  test('Cannot create match without required fields', async () => {
    const res = await request('POST', '/api/matches', {});
    expect(res.status).toBe(400);
  });

  test('Cannot record result for non-participant', async () => {
    // Create fresh tournament + match for this test
    const p1 = await request('POST', '/api/players', { name: 'P1' });
    const p2 = await request('POST', '/api/players', { name: 'P2' });
    const p3 = await request('POST', '/api/players', { name: 'P3' });

    const t = await request('POST', '/api/tournaments', { name: 'Test' });
    await request('POST', `/api/tournaments/${t.body.id}/register`, { player_id: p1.body.id });
    await request('POST', `/api/tournaments/${t.body.id}/register`, { player_id: p2.body.id });
    await request('PATCH', `/api/tournaments/${t.body.id}/state`, { state: 'in_progress' });

    const m = await request('POST', '/api/matches', {
      tournament_id: t.body.id,
      team_a_id: p1.body.id,
      team_b_id: p2.body.id,
    });
    await request('PATCH', `/api/matches/${m.body.id}/status`, { status: 'in_progress' });

    const res = await request('POST', `/api/matches/${m.body.id}/result`, { winner_id: p3.body.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be one of the match participants');
  });

  test('Cannot skip match states', async () => {
    const p1 = await request('POST', '/api/players', { name: 'X1' });
    const p2 = await request('POST', '/api/players', { name: 'X2' });
    const t = await request('POST', '/api/tournaments', { name: 'Skip Test' });
    await request('POST', `/api/tournaments/${t.body.id}/register`, { player_id: p1.body.id });
    await request('POST', `/api/tournaments/${t.body.id}/register`, { player_id: p2.body.id });
    await request('PATCH', `/api/tournaments/${t.body.id}/state`, { state: 'in_progress' });

    const m = await request('POST', '/api/matches', {
      tournament_id: t.body.id,
      team_a_id: p1.body.id,
      team_b_id: p2.body.id,
    });

    // Cannot go from scheduled directly to completed
    const res = await request('PATCH', `/api/matches/${m.body.id}/status`, { status: 'completed' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid state transition');
  });

  test('Team type player can have members', async () => {
    const team = await request('POST', '/api/players', { name: 'Team Alpha', type: 'team' });
    expect(team.status).toBe(201);
    expect(team.body.type).toBe('team');

    const members = await request('POST', `/api/players/${team.body.id}/members`, { player_name: 'Member 1' });
    expect(members.status).toBe(201);
    expect(members.body).toHaveLength(1);
  });

  test('Single player cannot have members', async () => {
    const player = await request('POST', '/api/players', { name: 'Solo' });
    const res = await request('POST', `/api/players/${player.body.id}/members`, { player_name: 'Nope' });
    expect(res.status).toBe(400);
  });
});
