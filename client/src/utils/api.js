import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
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

export function createTournament(data) {
  return request('/tournaments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTournament(id, data) {
  return request(`/tournaments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
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

// --- Staff ---
export function addStaff(tournamentId, data) {
  return request(`/tournaments/${tournamentId}/staff`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listStaff(tournamentId) {
  return request(`/tournaments/${tournamentId}/staff`);
}

export function removeStaff(tournamentId, staffId) {
  return request(`/tournaments/${tournamentId}/staff/${staffId}`, { method: 'DELETE' });
}

// --- Reviews ---
export function addReview(tournamentId, data) {
  return request(`/tournaments/${tournamentId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listReviews(tournamentId) {
  return request(`/tournaments/${tournamentId}/reviews`);
}

// --- Messages ---
export function sendMessage(tournamentId, data) {
  return request(`/tournaments/${tournamentId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listMessages(tournamentId) {
  return request(`/tournaments/${tournamentId}/messages`);
}

// --- PDF/Excel Export ---
export function getExportPdfUrl(tournamentId) {
  return `${API_BASE}/tournaments/${tournamentId}/export/pdf`;
}

export function getExportExcelUrl(tournamentId) {
  return `${API_BASE}/tournaments/${tournamentId}/export/excel`;
}
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth API
export const registerUser = (data) => apiFetch('/auth/register', { method: 'POST', body: data });
export const loginUser = (data) => apiFetch('/auth/login', { method: 'POST', body: data });
export const getCurrentUser = () => apiFetch('/auth/me');

// Tournament API
export const getTournaments = () => apiFetch('/tournaments');
export const getTournament = (id) => apiFetch(`/tournaments/${id}`);
export const createTournament = (data) => apiFetch('/tournaments', { method: 'POST', body: data });
export const updateTournament = (id, data) => apiFetch(`/tournaments/${id}`, { method: 'PUT', body: data });
export const deleteTournament = (id) => apiFetch(`/tournaments/${id}`, { method: 'DELETE' });

// Registration API
export const getRegistrations = (tid) => apiFetch(`/tournaments/${tid}/registrations`);
export const addRegistration = (tid, data) => apiFetch(`/tournaments/${tid}/registrations`, { method: 'POST', body: data });
export const removeRegistration = (tid, rid) => apiFetch(`/tournaments/${tid}/registrations/${rid}`, { method: 'DELETE' });

// Match API
export const getMatches = (tid) => apiFetch(`/tournaments/${tid}/matches`);
export const createMatch = (tid, data) => apiFetch(`/tournaments/${tid}/matches`, { method: 'POST', body: data });
export const updateMatch = (tid, mid, data) => apiFetch(`/tournaments/${tid}/matches/${mid}`, { method: 'PUT', body: data });
export const deleteMatch = (tid, mid) => apiFetch(`/tournaments/${tid}/matches/${mid}`, { method: 'DELETE' });

// Pool API
export const getPools = (tid) => apiFetch(`/tournaments/${tid}/pools`);
export const createPool = (tid, data) => apiFetch(`/tournaments/${tid}/pools`, { method: 'POST', body: data });
export const addPlayerToPool = (tid, pid, data) => apiFetch(`/tournaments/${tid}/pools/${pid}/players`, { method: 'POST', body: data });
export const removePlayerFromPool = (tid, pid, playerId) => apiFetch(`/tournaments/${tid}/pools/${pid}/players/${playerId}`, { method: 'DELETE' });
export const deletePool = (tid, pid) => apiFetch(`/tournaments/${tid}/pools/${pid}`, { method: 'DELETE' });

// Staff API
export const getStaff = (tid) => apiFetch(`/tournaments/${tid}/staff`);
export const addStaff = (tid, data) => apiFetch(`/tournaments/${tid}/staff`, { method: 'POST', body: data });
export const removeStaff = (tid, sid) => apiFetch(`/tournaments/${tid}/staff/${sid}`, { method: 'DELETE' });

// Message API
export const getMessages = (tid) => apiFetch(`/tournaments/${tid}/messages`);
export const sendMessage = (tid, data) => apiFetch(`/tournaments/${tid}/messages`, { method: 'POST', body: data });

// Payment API
export const getPayments = (tid) => apiFetch(`/tournaments/${tid}/payments`);
export const getEarnings = (tid) => apiFetch(`/tournaments/${tid}/payments/earnings`);
export const requestWithdrawal = (tid, data) => apiFetch(`/tournaments/${tid}/payments/withdraw`, { method: 'POST', body: data });
