export interface Host {
  id: number;
  username: string;
}

export interface Tournament {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'registration_open' | 'registration_closed' | 'pools_published' | 'in_progress' | 'closed' | 'archived';
  max_players: number;
  created_at: string;
}

export interface Player {
  id: number;
  tournament_id: number;
  name: string;
  email: string;
  phone: string;
  seed: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'late' | 'withdrawn';
  registered_at: string;
}

export interface Pool {
  id: number;
  tournament_id: number;
  name: string;
  published: boolean;
  order_index: number;
  players: Player[];
}

export interface Match {
  id: number;
  tournament_id: number;
  pool_id: number | null;
  player1_id: number | null;
  player2_id: number | null;
  player1_name?: string;
  player2_name?: string;
  round: number;
  match_number: number;
  scheduled_at: string | null;
  score_player1: string | null;
  score_player2: string | null;
  winner_id: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_late_registration: boolean;
  bracket_position: number | null;
}

export interface BracketMatch {
  id: number;
  round: number;
  match_id: number;
  next_match_id: number | null;
  match: Match;
}
