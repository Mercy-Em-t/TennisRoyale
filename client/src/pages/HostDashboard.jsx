import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import RevenueSummary from '../components/RevenueSummary';

export default function HostDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes] = await Promise.all([
          api.get('/host/dashboard'),
        ]);
        setDashboard(dashRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleWithdraw = async (tournamentId) => {
    try {
      const res = await api.post('/host/withdraw', { tournament_id: tournamentId });
      setMessage(`Withdrawn $${res.data.amount} successfully!`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Withdrawal failed');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="host-dashboard">
      <h1>Host Dashboard</h1>
      {dashboard && <RevenueSummary dashboard={dashboard} />}
      
      <div className="dashboard-actions">
        <Link to="/host/create-tournament" className="btn btn-primary">+ Create Tournament</Link>
      </div>

      {message && <p className="info">{message}</p>}
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTournament, updateTournament, deleteTournament, getEarnings, requestWithdrawal } from '../utils/api';
import QuickStats from '../components/QuickStats';
import StatusActions from '../components/StatusActions';
import RegistrationManager from '../components/RegistrationManager';
import MatchManager from '../components/MatchManager';
import PoolManager from '../components/PoolManager';
import StaffManager from '../components/StaffManager';
import MessageCenter from '../components/MessageCenter';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'players', label: 'Players', icon: '👥' },
  { id: 'matches', label: 'Matches', icon: '🎾' },
  { id: 'pools', label: 'Pools', icon: '🏊' },
  { id: 'more', label: 'More', icon: '⋯' },
];

const statusLabels = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export default function HostDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [withdrawMsg, setWithdrawMsg] = useState(null);

  const loadTournament = useCallback(async () => {
    try {
      const data = await getTournament(id);
      setTournament(data);
      setError(null);
      // Load earnings if tournament has a fee
      try {
        const earningsData = await getEarnings(id);
        setEarnings(earningsData);
      } catch {
        /* earnings may fail for non-owners, that's ok */
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  async function handleStatusChange(newStatus) {
    try {
      await updateTournament(id, { status: newStatus });
      loadTournament();
    } catch {
      /* empty */
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await deleteTournament(id);
      navigate('/');
    } catch {
      /* empty */
    }
  }

  async function handleToggleLateReg() {
    try {
      await updateTournament(id, { late_registration_open: tournament.late_registration_open ? 0 : 1 });
      loadTournament();
    } catch {
      /* empty */
    }
  }

  async function handleWithdraw() {
    if (!earnings || earnings.available <= 0) return;
    setWithdrawMsg(null);
    try {
      await requestWithdrawal(id, { amount: earnings.available });
      setWithdrawMsg({ type: 'success', text: `Withdrew KSh ${earnings.available.toLocaleString()} successfully!` });
      loadTournament();
    } catch (err) {
      setWithdrawMsg({ type: 'error', text: err.message });
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading dashboard...</div></div>;
  if (error) return <div className="page"><div className="error-state">Error: {error}</div></div>;
  if (!tournament) return <div className="page"><div className="error-state">Tournament not found</div></div>;

  return (
    <div className="page dashboard-page">
      {/* Mobile-optimized header */}
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <button className="btn-back" onClick={() => navigate('/')} aria-label="Back to tournaments">
            ← Back
          </button>
          <div className="dashboard-header-actions">
            <button
              className="btn-icon"
              onClick={() => loadTournament()}
              aria-label="Refresh"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>
        <div className="dashboard-header-info">
          <h1 className="dashboard-title">{tournament.name}</h1>
          <div className="dashboard-meta">
            <span className={`status-badge status-${tournament.status}`}>
              {statusLabels[tournament.status] || tournament.status}
            </span>
            {tournament.date && <span className="meta-item">📅 {new Date(tournament.date).toLocaleDateString()}</span>}
            {tournament.location && <span className="meta-item">📍 {tournament.location}</span>}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="tab-content" data-testid="tab-overview">
            <QuickStats stats={tournament.stats} tournament={tournament} />
            <StatusActions
              tournament={tournament}
              onStatusChange={handleStatusChange}
              onToggleLateReg={handleToggleLateReg}
              onDelete={handleDelete}
            />
            {earnings && earnings.payment_count > 0 && (
              <div className="earnings-panel">
                <h3 className="earnings-title">💰 Payment & Earnings</h3>
                <div className="earnings-grid">
                  <div className="earnings-stat collected">
                    <span className="earnings-stat-value">KSh {earnings.total_collected.toLocaleString()}</span>
                    <span className="earnings-stat-label">Total Collected</span>
                  </div>
                  <div className="earnings-stat platform">
                    <span className="earnings-stat-value">KSh {earnings.platform_total.toLocaleString()}</span>
                    <span className="earnings-stat-label">Platform Fee (10%)</span>
                  </div>
                  <div className="earnings-stat available">
                    <span className="earnings-stat-value">KSh {earnings.available.toLocaleString()}</span>
                    <span className="earnings-stat-label">Available to Withdraw</span>
                  </div>
                  <div className="earnings-stat withdrawn">
                    <span className="earnings-stat-value">KSh {earnings.withdrawn.toLocaleString()}</span>
                    <span className="earnings-stat-label">Withdrawn</span>
                  </div>
                </div>
                {!earnings.can_withdraw && (
                  <div className="earnings-escrow-notice">
                    🔒 Funds held in escrow until tournament is completed
                  </div>
                )}
                {earnings.can_withdraw && earnings.available > 0 && (
                  <button className="btn btn-primary withdraw-btn" onClick={handleWithdraw}>
                    💸 Withdraw KSh {earnings.available.toLocaleString()}
                  </button>
                )}
                {withdrawMsg && (
                  <div className={`auth-error ${withdrawMsg.type === 'success' ? 'auth-success' : ''}`} style={{ marginTop: '0.5rem' }}>
                    {withdrawMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="tab-content" data-testid="tab-players">
            <RegistrationManager
              tournamentId={id}
              tournament={tournament}
              onUpdate={loadTournament}
            />
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="tab-content" data-testid="tab-matches">
            <MatchManager
              tournamentId={id}
              onUpdate={loadTournament}
            />
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="tab-content" data-testid="tab-pools">
            <PoolManager
              tournamentId={id}
              onUpdate={loadTournament}
            />
          </div>
        )}

        {activeTab === 'more' && (
          <div className="tab-content" data-testid="tab-more">
            <div className="more-sections">
              <section className="dashboard-section">
                <h2 className="section-title">👥 Staff Management</h2>
                <StaffManager tournamentId={id} />
              </section>
              <section className="dashboard-section">
                <h2 className="section-title">💬 Message Center</h2>
                <MessageCenter tournamentId={id} />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" role="tablist" aria-label="Dashboard navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setShowMoreMenu(false);
            }}
          >
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
