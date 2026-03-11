const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || body.message || res.statusText);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function createTournament(name) {
  return request('/tournaments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function listTournaments() {
  return request('/tournaments');
}

export function getTournament(id) {
  return request(`/tournaments/${id}`);
}

export function openRegistration(id) {
  return request(`/tournaments/${id}/open-registration`, { method: 'PATCH' });
}

export function closeRegistration(id) {
  return request(`/tournaments/${id}/close-registration`, { method: 'PATCH' });
}

export function openLateRegistration(id) {
  return request(`/tournaments/${id}/open-late-registration`, { method: 'PATCH' });
}

export function closeLateRegistration(id) {
  return request(`/tournaments/${id}/close-late-registration`, { method: 'PATCH' });
}

export function closeTournament(id) {
  return request(`/tournaments/${id}/close`, { method: 'PATCH' });
}

export function exportTournament(id) {
  return request(`/tournaments/${id}/export`);
}

export function archiveTournament(id) {
  return request(`/tournaments/${id}/archive`, { method: 'POST' });
}

export function registerPlayer(id, playerName, playerEmail) {
  return request(`/tournaments/${id}/registrations`, {
    method: 'POST',
    body: JSON.stringify({ playerName, playerEmail }),
  });
}

export function listRegistrations(id) {
  return request(`/tournaments/${id}/registrations`);
}

export function createPools(id, pools) {
  return request(`/tournaments/${id}/pools`, {
    method: 'POST',
    body: JSON.stringify({ pools }),
  });
}

export function getPools(id) {
  return request(`/tournaments/${id}/pools`);
}

export function updatePoolPlayers(tournamentId, poolId, players) {
  return request(`/tournaments/${tournamentId}/pools/${poolId}/players`, {
    method: 'PUT',
    body: JSON.stringify({ players }),
  });
}

export function publishPools(id) {
  return request(`/tournaments/${id}/publish-pools`, { method: 'PATCH' });
}

export function generateMatches(id) {
  return request(`/tournaments/${id}/generate-matches`, { method: 'POST' });
}

export function appendLateRegistrations(id, assignments) {
  return request(`/tournaments/${id}/append-late-registrations`, {
    method: 'POST',
    body: JSON.stringify({ assignments }),
  });
}

export function getMatches(id) {
  return request(`/tournaments/${id}/matches`);
}

export function scheduleMatch(matchId, scheduledAt) {
  return request(`/tournaments/matches/${matchId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduledAt }),
  });
}

export function scoreMatch(matchId, scorePlayer1, scorePlayer2) {
  return request(`/tournaments/matches/${matchId}/score`, {
    method: 'PATCH',
    body: JSON.stringify({ scorePlayer1, scorePlayer2 }),
  });
}

export function advanceBracket(id, bracketStage) {
  return request(`/tournaments/${id}/advance-bracket`, {
    method: 'POST',
    body: JSON.stringify({ bracketStage }),
  });
}
