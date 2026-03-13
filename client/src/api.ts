import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email: string, password: string) => api.post('/auth/login', { email, password });
export const registerHost = (name: string, email: string, password: string) => api.post('/auth/signup', { name, email, password, role: 'host' });
export const getMe = () => api.get('/auth/me');

// Tournaments
export const getTournaments = () => api.get('/tournaments');
export const createTournament = (data: any) => api.post('/tournaments', data);
export const getTournament = (id: string | number) => api.get(`/tournaments/${id}`);
export const deleteTournament = (id: string | number) => api.delete(`/tournaments/${id}`);

// Tournament States
export const openRegistration = (id: string | number) => api.post(`/tournaments/${id}/open-registration`);
export const closeRegistration = (id: string | number) => api.post(`/tournaments/${id}/close-registration`);
export const openLateRegistration = (id: string | number) => api.post(`/tournaments/${id}/open-late-registration`);
export const startTournament = (id: string | number) => api.post(`/tournaments/${id}/in-progress`);
export const closeTournament = (id: string | number) => api.post(`/tournaments/${id}/completed`);
export const archiveTournament = (id: string | number) => api.post(`/tournaments/${id}/archived`);
export const completeTournament = closeTournament; // Alias

// Registrations
export const getRegistrations = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/registrations`);
export const addRegistration = (tournamentId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/registrations`, data);
export const submitRegistration = addRegistration; // Alias
export const acceptRegistration = (tournamentId: string | number, registrationId: string | number) => api.patch(`/tournaments/${tournamentId}/registrations/${registrationId}/accept`);
export const rejectRegistration = (tournamentId: string | number, registrationId: string | number) => api.patch(`/tournaments/${tournamentId}/registrations/${registrationId}/reject`);
export const setSeed = (tournamentId: string | number, registrationId: string | number, seed: number | null) => api.patch(`/tournaments/${tournamentId}/registrations/${registrationId}/seed`, { seed });
export const removeRegistration = (tournamentId: string | number, registrationId: string | number) => api.delete(`/tournaments/${tournamentId}/registrations/${registrationId}`);

// Pools
export const getPools = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/pools`);
export const createPool = (tournamentId: string | number, name: string) => api.post(`/tournaments/${tournamentId}/pools`, { name });
export const deletePool = (tournamentId: string | number, poolId: string | number) => api.delete(`/tournaments/${tournamentId}/pools/${poolId}`);
export const addPlayerToPool = (tournamentId: string | number, poolId: string | number, registrationId: string | number) => api.post(`/tournaments/${tournamentId}/pools/${poolId}/players`, { registration_id: registrationId });
export const removePlayerFromPool = (tournamentId: string | number, poolId: string | number, registrationId: string | number) => api.delete(`/tournaments/${tournamentId}/pools/${poolId}/players/${registrationId}`);
export const reorderPoolPlayers = (tournamentId: string | number, poolId: string | number, order: (string | number)[]) => api.put(`/tournaments/${tournamentId}/pools/${poolId}/players/reorder`, { order });
export const autoAssignPools = (tournamentId: string | number, playersPerPool: number) => api.post(`/tournaments/${tournamentId}/pools/auto-generate`, { players_per_pool: playersPerPool });
export const generatePoolMatches = (tournamentId: string | number, poolId: string | number) => api.post(`/tournaments/${tournamentId}/pools/${poolId}/generate-matches`);
export const generateLateMatches = (tournamentId: string | number, poolId: string | number) => api.post(`/tournaments/${tournamentId}/pools/${poolId}/generate-late-matches`);
export const publishPools = (tournamentId: string | number) => api.post(`/tournaments/${tournamentId}/publish-pools`); // Placeholder if needed

// Matches
export const getMatches = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/matches`);
export const createMatch = (tournamentId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/matches`, data);
export const updateMatch = (tournamentId: string | number, matchId: string | number, data: any) => api.put(`/tournaments/${tournamentId}/matches/${matchId}`, data);
export const scheduleMatch = (tournamentId: string | number, matchId: string | number, scheduledAt: string) => api.patch(`/tournaments/${tournamentId}/matches/${matchId}/schedule`, { scheduled_at: scheduledAt });
export const scoreMatch = (tournamentId: string | number, matchId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/matches/${matchId}/score`, data);
export const deleteMatch = (tournamentId: string | number, matchId: string | number) => api.delete(`/tournaments/${tournamentId}/matches/${matchId}`);

// Brackets
export const generateBracket = (tournamentId: string | number) => api.post(`/tournaments/${tournamentId}/bracket/generate`);
export const getBracket = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/bracket`);
export const advanceBracket = (tournamentId: string | number, matchId: string | number, winnerId: string | number) => api.patch(`/tournaments/${tournamentId}/bracket/advance`, { match_id: matchId, winner_id: winnerId });

// Messaging
export const getMessages = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/messages`);
export const sendMessage = (tournamentId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/messages`, data);

// Staff
export const getStaff = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/staff`);
export const addStaff = (tournamentId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/staff`, data);
export const removeStaff = (tournamentId: string | number, staffId: string | number) => api.delete(`/tournaments/${tournamentId}/staff/${staffId}`);

// Reviews
export const getReviews = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/reviews`);
export const addReview = (tournamentId: string | number, data: any) => api.post(`/tournaments/${tournamentId}/reviews`, data);

// Export
export const exportTournament = (tournamentId: string | number) => api.get(`/tournaments/${tournamentId}/export`);
export const getExportPdfUrl = (tournamentId: string | number) => `${api.defaults.baseURL}/tournaments/${tournamentId}/export/pdf`;
export const getExportExcelUrl = (tournamentId: string | number) => `${api.defaults.baseURL}/tournaments/${tournamentId}/export/excel`;

export default api;
