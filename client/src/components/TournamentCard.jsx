import { Link } from 'react-router-dom';

export default function TournamentCard({ tournament }) {
  const availableSlots = tournament.max_players - tournament.current_players;

  return (
    <div className="tournament-card">
      <h3><Link to={`/tournaments/${tournament.id}`}>{tournament.title}</Link></h3>
      <p className="sport-badge">{tournament.sport}</p>
      {tournament.location && <p>📍 {tournament.location}</p>}
      {tournament.start_date && <p>📅 {new Date(tournament.start_date).toLocaleDateString()}</p>}
      <p>💰 Entry Fee: ${tournament.entry_fee}</p>
      <p>👥 {availableSlots} / {tournament.max_players} slots available</p>
      {tournament.host_name && <p>🏠 Host: {tournament.host_name}</p>}
      <Link to={`/tournaments/${tournament.id}`} className="btn btn-primary">View Details</Link>
    </div>
  );
}
