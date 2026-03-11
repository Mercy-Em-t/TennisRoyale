import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });
export const registerHost = (username: string, password: string) =>
  api.post('/auth/register', { username, password });

// Tournaments
export const getTournaments = () => api.get('/tournaments');
export const createTournament = (data: Record<string, unknown>) => api.post('/tournaments', data);
export const getTournament = (id: number) => api.get(`/tournaments/${id}`);
export const openRegistration = (id: number) => api.post(`/tournaments/${id}/open-registration`);
export const closeRegistration = (id: number) => api.post(`/tournaments/${id}/close-registration`);
export const publishPools = (id: number) => api.post(`/tournaments/${id}/publish-pools`);
export const startTournament = (id: number) => api.post(`/tournaments/${id}/start`);
export const closeTournament = (id: number) => api.post(`/tournaments/${id}/close`);
export const archiveTournament = (id: number) => api.post(`/tournaments/${id}/archive`);
export const exportTournament = (id: number) => api.get(`/tournaments/${id}/export`);
export const openLateRegistration = (id: number) =>
  api.post(`/tournaments/${id}/open-late-registration`);

// Registrations
export const getRegistrations = (tournamentId: number) =>
  api.get(`/tournaments/${tournamentId}/registrations`);
export const submitRegistration = (tournamentId: number, data: Record<string, unknown>) =>
  api.post(`/tournaments/${tournamentId}/registrations`, data);
export const acceptRegistration = (tournamentId: number, playerId: number) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${playerId}/accept`);
export const rejectRegistration = (tournamentId: number, playerId: number) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${playerId}/reject`);
export const setSeed = (tournamentId: number, playerId: number, seed: number | null) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${playerId}/seed`, { seed });

// Pools
export const getPools = (tournamentId: number) =>
  api.get(`/tournaments/${tournamentId}/pools`);
export const createPool = (tournamentId: number, name: string) =>
  api.post(`/tournaments/${tournamentId}/pools`, { name });
export const deletePool = (tournamentId: number, poolId: number) =>
  api.delete(`/tournaments/${tournamentId}/pools/${poolId}`);
export const addPlayerToPool = (tournamentId: number, poolId: number, playerId: number) =>
  api.post(`/tournaments/${tournamentId}/pools/${poolId}/players`, { player_id: playerId });
export const removePlayerFromPool = (tournamentId: number, poolId: number, playerId: number) =>
  api.delete(`/tournaments/${tournamentId}/pools/${poolId}/players/${playerId}`);
export const reorderPoolPlayers = (
  tournamentId: number,
  poolId: number,
  playerIds: number[]
) => api.put(`/tournaments/${tournamentId}/pools/${poolId}/players/reorder`, { player_ids: playerIds });
export const autoAssignPools = (tournamentId: number, poolCount: number) =>
  api.post(`/tournaments/${tournamentId}/pools/auto-assign`, { pool_count: poolCount });
export const generatePoolMatches = (tournamentId: number, poolId: number) =>
  api.post(`/tournaments/${tournamentId}/pools/${poolId}/generate-matches`);

// Matches
export const getMatches = (tournamentId: number) =>
  api.get(`/tournaments/${tournamentId}/matches`);
export const scheduleMatch = (tournamentId: number, matchId: number, scheduledAt: string) =>
  api.patch(`/tournaments/${tournamentId}/matches/${matchId}/schedule`, {
    scheduled_at: scheduledAt,
  });
export const scoreMatch = (tournamentId: number, matchId: number, data: Record<string, unknown>) =>
  api.patch(`/tournaments/${tournamentId}/matches/${matchId}/score`, data);
export const generateLateMatches = (tournamentId: number, poolId: number) =>
  api.post(`/tournaments/${tournamentId}/pools/${poolId}/generate-late-matches`);

// Brackets
export const getBracket = (tournamentId: number) =>
  api.get(`/tournaments/${tournamentId}/bracket`);
export const generateBracket = (tournamentId: number) =>
  api.post(`/tournaments/${tournamentId}/bracket/generate`);
export const advanceBracket = (tournamentId: number, matchId: number, winnerId: number) =>
  api.patch(`/tournaments/${tournamentId}/bracket/advance`, {
    match_id: matchId,
    winner_id: winnerId,
  });

export default api;
