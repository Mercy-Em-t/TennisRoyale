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
