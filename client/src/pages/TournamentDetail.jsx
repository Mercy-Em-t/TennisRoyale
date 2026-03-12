import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTournament,
  openRegistration,
  closeRegistration,
  openLateRegistration,
  closeLateRegistration,
  closeTournament,
  archiveTournament,
  publishPools,
  generateMatches,
} from '../utils/api';
import RegistrationForm from '../components/RegistrationForm';
import RegistrationList from '../components/RegistrationList';
import PoolManager from '../components/PoolManager';
import MatchList from '../components/MatchList';
import BracketView from '../components/BracketView';
import ExportButton from '../components/ExportButton';
import StaffManager from '../components/StaffManager';
import ReviewSection from '../components/ReviewSection';
import MessageCenter from '../components/MessageCenter';

const LIFECYCLE_ACTIONS = {
  draft: [{ label: 'Open Registration', action: openRegistration }],
  registration_open: [{ label: 'Close Registration', action: closeRegistration }],
  registration_closed: [],
  in_progress: [
    { label: 'Open Late Registration', action: openLateRegistration },
    { label: 'Close Tournament', action: closeTournament },
  ],
  in_progress_late_open: [
    { label: 'Close Late Registration', action: closeLateRegistration },
    { label: 'Close Tournament', action: closeTournament },
  ],
  completed: [{ label: 'Archive Tournament', action: archiveTournament }],
};

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchTournament = useCallback(async () => {
    try {
      const data = await getTournament(id);
      setTournament(data);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  const handleAction = async (label, actionFn) => {
    setActionLoading(label);
    setError('');
    try {
      await actionFn(id);
      await fetchTournament();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handlePublishPools = async () => {
    setActionLoading('Publish Pools');
    setError('');
    try {
      await publishPools(id);
      await fetchTournament();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleGenerateMatches = async () => {
    setActionLoading('Generate Matches');
    setError('');
    try {
      await generateMatches(id);
      await fetchTournament();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  if (!tournament && !error) return <p>Loading tournament…</p>;
  if (error && !tournament) return <p className="error">{error}</p>;

  // Derive effective status considering late_registration_open flag
  const rawStatus = tournament.status;
  const isLateOpen = tournament.late_registration_open === 1;
  const effectiveStatus = (rawStatus === 'in_progress' && isLateOpen) ? 'in_progress_late_open' : rawStatus;

  const actions = LIFECYCLE_ACTIONS[effectiveStatus] || LIFECYCLE_ACTIONS[rawStatus] || [];
  const showRegistrationForm = rawStatus === 'registration_open' || (rawStatus === 'in_progress' && isLateOpen);
  const showPoolManager = [
    'registration_closed', 'in_progress',
  ].includes(rawStatus);
  const showMatches = ['in_progress', 'completed'].includes(rawStatus);
  const showBracket = ['in_progress', 'completed'].includes(rawStatus);
  const canPublishPools = rawStatus === 'registration_closed' && tournament.pools_published !== 1;
  const canGenerateMatches = rawStatus === 'registration_closed' && tournament.pools_published === 1;

  return (
    <div className="tournament-detail">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="tournament-header">
        <h2>{tournament.name}</h2>
        <span className={`status-badge status-${effectiveStatus}`}>{effectiveStatus.replace(/_/g, ' ')}</span>
      </div>

      {/* Tournament details summary */}
      <div className="tournament-info-bar">
        {tournament.date && <span>📅 {tournament.date}</span>}
        {tournament.location && <span>📍 {tournament.location}</span>}
        {tournament.fee > 0 && <span>💰 ${tournament.fee}</span>}
        {tournament.max_participants && <span>👥 Max {tournament.max_participants}</span>}
        {tournament.certificate_enabled === 1 && <span>🏅 Certificates</span>}
        {tournament.poster_url && (
          <a href={tournament.poster_url} target="_blank" rel="noopener noreferrer" className="poster-link">🖼️ Poster</a>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="action-bar">
        {actions.map(({ label, action }) => (
          <button
            key={label}
            onClick={() => handleAction(label, action)}
            disabled={actionLoading === label}
          >
            {actionLoading === label ? '…' : label}
          </button>
        ))}
        {canPublishPools && (
          <button onClick={handlePublishPools} disabled={actionLoading === 'Publish Pools'}>
            {actionLoading === 'Publish Pools' ? '…' : 'Publish Pools'}
          </button>
        )}
        {canGenerateMatches && (
          <button onClick={handleGenerateMatches} disabled={actionLoading === 'Generate Matches'}>
            {actionLoading === 'Generate Matches' ? '…' : 'Generate Matches'}
          </button>
        )}
        <ExportButton tournamentId={id} />
      </div>

      {/* Staff Management */}
      <section className="section">
        <StaffManager tournamentId={id} />
      </section>

      {showRegistrationForm && (
        <section className="section">
          <RegistrationForm tournamentId={id} onRegistered={fetchTournament} />
        </section>
      )}

      <section className="section">
        <RegistrationList tournamentId={id} />
      </section>

      {showPoolManager && (
        <section className="section">
          <PoolManager
            tournamentId={id}
            status={effectiveStatus}
            onPoolsChanged={fetchTournament}
          />
        </section>
      )}

      {showMatches && (
        <section className="section">
          <MatchList tournamentId={id} status={effectiveStatus} />
        </section>
      )}

      {showBracket && (
        <section className="section">
          <BracketView tournamentId={id} status={effectiveStatus} />
        </section>
      )}

      {/* Messages (during tournament) */}
      {['in_progress', 'in_progress_late_open'].includes(effectiveStatus) && (
        <section className="section">
          <MessageCenter tournamentId={id} />
        </section>
      )}

      {/* Reviews */}
      <section className="section">
        <ReviewSection tournamentId={id} />
      </section>
    </div>
  );
}
