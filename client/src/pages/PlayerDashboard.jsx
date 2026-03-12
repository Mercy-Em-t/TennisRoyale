import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getTournament, getRegistrations, addRegistration, getMatches } from '../utils/api';

const statusLabels = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

// Magazine-style articles for the home feed
const MAGAZINE_ARTICLES = [
  { id: 1, type: 'featured', category: 'News', title: 'Grand Slam Season is Here!', excerpt: 'The biggest tournaments of the year are about to begin. Get ready for an exciting season of world-class tennis.', image: '🎾', date: 'Mar 11, 2026' },
  { id: 2, type: 'partner', category: 'Partnership', title: 'Official Equipment Partner', excerpt: 'TennisRoyale partners with top racket brands to bring exclusive deals to our players.', image: '🤝', date: 'Mar 10, 2026' },
  { id: 3, type: 'ad', category: 'Sponsored', title: 'Premium Court Booking', excerpt: 'Book courts at partner facilities with 20% off using your TennisRoyale membership.', image: '🏟️', date: 'Mar 9, 2026' },
  { id: 4, type: 'news', category: 'Updates', title: 'New Ranking System', excerpt: 'We\'re introducing an updated ranking system that better reflects player performance across tournaments.', image: '📊', date: 'Mar 8, 2026' },
  { id: 5, type: 'brand', category: 'Lifestyle', title: 'Tennis Apparel Collection 2026', excerpt: 'Discover the latest tennis fashion and gear from our brand partners. Style meets performance.', image: '👕', date: 'Mar 7, 2026' },
  { id: 6, type: 'news', category: 'Community', title: 'Player Spotlight: Rising Stars', excerpt: 'Meet the breakout players from last month\'s regional tournaments who are making waves.', image: '⭐', date: 'Mar 6, 2026' },
];

export default function PlayerDashboard() {
  const { user, logout, hasManagementRole, switchToManagement } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [homeFeed, setHomeFeed] = useState('public');
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function selectTournament(id) {
    try {
      const [t, regs, m] = await Promise.all([
        getTournament(id),
        getRegistrations(id),
        getMatches(id),
      ]);
      setSelectedTournament(t);
      setRegistrations(regs);
      setMatches(m);
    } catch {
      /* empty */
    }
  }

  async function handleRegister(tournamentId) {
    setRegLoading(true);
    setMessage(null);
    try {
      await addRegistration(tournamentId, { name: user.name, email: user.email });
      setMessage({ type: 'success', text: 'Successfully registered!' });
      await selectTournament(tournamentId);
      loadTournaments();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  }

  const isRegistered = registrations.some(r => r.player_email === user.email);
  const myMatches = matches.filter(m => {
    const myReg = registrations.find(r => r.player_email === user.email);
    if (!myReg) return false;
    return m.player1_id === myReg.player_id || m.player2_id === myReg.player_id;
  });

  // Upcoming tournaments for the feed
  const upcomingTournaments = tournaments.filter(t =>
    ['registration_open', 'in_progress'].includes(t.status)
  );

  // My registered tournaments
  const myTournaments = tournaments.filter(t => {
    // we'd need to check registrations per tournament but for the feed just show open ones
    return ['registration_open', 'in_progress', 'completed'].includes(t.status);
  });

  const TABS = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'tournaments', label: 'Tournaments', icon: '🏆' },
    { id: 'matches', label: 'Matches', icon: '🎾' },
    { id: 'notifications', label: 'Alerts', icon: '🔔' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="page dashboard-page player-page">
      {/* Side drawer for role switching (host/referee only) */}
      {hasManagementRole && (
        <>
          <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
          <div className={`role-drawer ${drawerOpen ? 'open' : ''}`}>
            <div className="drawer-header">
              <h3>Switch Role</h3>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-content">
              <div className="drawer-role active">
                <span className="drawer-role-icon">🎾</span>
                <div>
                  <div className="drawer-role-name">Player Mode</div>
                  <div className="drawer-role-desc">Browse tournaments & view matches</div>
                </div>
              </div>
              <button
                className="drawer-role"
                onClick={() => { setDrawerOpen(false); switchToManagement(); }}
              >
                <span className="drawer-role-icon">{user.role === 'host' ? '🏟️' : '📋'}</span>
                <div>
                  <div className="drawer-role-name">
                    {user.role === 'host' ? 'Host Dashboard' : 'Referee Dashboard'}
                  </div>
                  <div className="drawer-role-desc">
                    {user.role === 'host' ? 'Manage tournaments & players' : 'Score & officiate matches'}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content - no top-level header for player view */}
      <main className="dashboard-content player-content">
        {/* HOME TAB - Magazine Style */}
        {activeTab === 'home' && (
          <div className="tab-content" data-testid="tab-home">
            {/* Magazine header */}
            <div className="magazine-header">
              <div className="magazine-brand">
                <h1 className="magazine-title">🎾 TennisRoyale</h1>
                <p className="magazine-tagline">Your Tennis Universe</p>
              </div>
              <div className="magazine-actions">
                {hasManagementRole && (
                  <button className="btn-icon role-switch-btn" onClick={() => setDrawerOpen(true)} aria-label="Switch role">
                    ⚡
                  </button>
                )}
                <button className="btn-icon" onClick={logout} aria-label="Logout">
                  ↗
                </button>
              </div>
            </div>

            {/* Feed toggle */}
            <div className="feed-toggle">
              <button
                className={`feed-toggle-btn ${homeFeed === 'public' ? 'active' : ''}`}
                onClick={() => setHomeFeed('public')}
              >
                🌍 Public Feed
              </button>
              <button
                className={`feed-toggle-btn ${homeFeed === 'personal' ? 'active' : ''}`}
                onClick={() => setHomeFeed('personal')}
              >
                👤 My Updates
              </button>
            </div>

            {homeFeed === 'public' ? (
              <div className="magazine-feed">
                {/* Featured article */}
                <div className="magazine-card featured">
                  <div className="magazine-card-badge">Featured</div>
                  <div className="magazine-card-icon">{MAGAZINE_ARTICLES[0].image}</div>
                  <div className="magazine-card-body">
                    <span className="magazine-card-category">{MAGAZINE_ARTICLES[0].category}</span>
                    <h2 className="magazine-card-title">{MAGAZINE_ARTICLES[0].title}</h2>
                    <p className="magazine-card-excerpt">{MAGAZINE_ARTICLES[0].excerpt}</p>
                    <span className="magazine-card-date">{MAGAZINE_ARTICLES[0].date}</span>
                  </div>
                </div>

                {/* New tournaments section */}
                {upcomingTournaments.length > 0 && (
                  <div className="magazine-section">
                    <h3 className="magazine-section-title">🆕 New Tournaments</h3>
                    <div className="magazine-tournaments-row">
                      {upcomingTournaments.slice(0, 4).map(t => (
                        <div
                          key={t.id}
                          className="magazine-tournament-chip"
                          onClick={() => { setActiveTab('tournaments'); selectTournament(t.id); }}
                        >
                          <span className="chip-name">{t.name}</span>
                          <span className={`chip-status status-${t.status}`}>
                            {statusLabels[t.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Article grid */}
                <div className="magazine-grid">
                  {MAGAZINE_ARTICLES.slice(1).map(article => (
                    <div key={article.id} className={`magazine-card ${article.type}`}>
                      {article.type === 'partner' && <div className="magazine-card-badge partner">Partner</div>}
                      {article.type === 'ad' && <div className="magazine-card-badge sponsored">Ad</div>}
                      <div className="magazine-card-icon">{article.image}</div>
                      <div className="magazine-card-body">
                        <span className="magazine-card-category">{article.category}</span>
                        <h3 className="magazine-card-title">{article.title}</h3>
                        <p className="magazine-card-excerpt">{article.excerpt}</p>
                        <span className="magazine-card-date">{article.date}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Branding footer */}
                <div className="magazine-branding">
                  <div className="branding-item">🏆 Official Tournament Platform</div>
                  <div className="branding-item">🤝 Trusted by 500+ Clubs</div>
                  <div className="branding-item">🌍 Global Tennis Community</div>
                </div>
              </div>
            ) : (
              /* Personal Feed */
              <div className="personal-feed">
                <div className="personal-section">
                  <h3 className="personal-section-title">📋 My Tournament Activity</h3>
                  {myTournaments.length === 0 ? (
                    <div className="empty-state-sm">No tournament activity yet. Browse tournaments to get started!</div>
                  ) : (
                    myTournaments.slice(0, 5).map(t => (
                      <div key={t.id} className="personal-update-card" onClick={() => { setActiveTab('tournaments'); selectTournament(t.id); }}>
                        <div className="update-icon">🏆</div>
                        <div className="update-body">
                          <div className="update-title">{t.name}</div>
                          <div className="update-detail">
                            <span className={`status-badge status-${t.status}`}>{statusLabels[t.status]}</span>
                            {t.date && <span> · 📅 {new Date(t.date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {myMatches.length > 0 && (
                  <div className="personal-section">
                    <h3 className="personal-section-title">🎾 Recent Match Results</h3>
                    {myMatches.slice(0, 3).map(match => (
                      <div key={match.id} className="personal-update-card">
                        <div className="update-icon">{match.status === 'completed' ? '✅' : '⏳'}</div>
                        <div className="update-body">
                          <div className="update-title">{match.player1_name || 'TBD'} vs {match.player2_name || 'TBD'}</div>
                          {match.status === 'completed' && (
                            <div className="update-detail">{match.score_player1} - {match.score_player2} {match.winner_name && `· 🏆 ${match.winner_name}`}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="personal-section">
                  <h3 className="personal-section-title">👤 Quick Stats</h3>
                  <div className="personal-stats">
                    <div className="personal-stat"><span className="stat-num">{myMatches.length}</span><span className="stat-label">Matches</span></div>
                    <div className="personal-stat"><span className="stat-num">{myMatches.filter(m => m.status === 'completed').length}</span><span className="stat-label">Completed</span></div>
                    <div className="personal-stat"><span className="stat-num">{myTournaments.length}</span><span className="stat-label">Tournaments</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOURNAMENTS TAB */}
        {activeTab === 'tournaments' && (
          <div className="tab-content" data-testid="tab-tournaments">
            <div className="tab-header">
              <h2 className="section-title">Tournaments</h2>
            </div>
            {loading ? (
              <div className="loading">Loading tournaments...</div>
            ) : tournaments.length === 0 ? (
              <div className="empty-state-sm">No tournaments available</div>
            ) : (
              <div className="tournament-grid">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className={`tournament-card clickable ${selectedTournament?.id === t.id ? 'selected' : ''}`}
                    onClick={() => selectTournament(t.id)}
                  >
                    <div className="tournament-card-header">
                      <h3>{t.name}</h3>
                      <span className={`status-badge status-${t.status}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                    <div className="tournament-card-details">
                      {t.host_name && <span>🏟️ {t.host_name}</span>}
                      {t.date && <span>📅 {new Date(t.date).toLocaleDateString()}</span>}
                      {t.location && <span>📍 {t.location}</span>}
                      <span>👥 Max {t.max_participants}</span>
                      {t.fee > 0 && <span>💰 KSh {t.fee.toLocaleString()}</span>}
                      {t.fee === 0 && <span>🆓 Free</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTournament && (
              <div className="detail-panel tournament-page" data-testid="tournament-detail">
                <h2 className="section-title">{selectedTournament.name}</h2>

                {/* Tournament info grid */}
                <div className="tournament-info-grid">
                  {selectedTournament.host_name && (
                    <div className="info-item">
                      <span className="info-label">🏟️ Host</span>
                      <span className="info-value">{selectedTournament.host_name}</span>
                    </div>
                  )}
                  {selectedTournament.location && (
                    <div className="info-item">
                      <span className="info-label">📍 Location</span>
                      <span className="info-value">{selectedTournament.location}</span>
                    </div>
                  )}
                  {selectedTournament.date && (
                    <div className="info-item">
                      <span className="info-label">📅 Date</span>
                      <span className="info-value">{new Date(selectedTournament.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">📊 Status</span>
                    <span className={`status-badge status-${selectedTournament.status}`}>
                      {statusLabels[selectedTournament.status]}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">👥 Players</span>
                    <span className="info-value">{selectedTournament.stats?.registrations || 0} / {selectedTournament.max_participants}</span>
                  </div>
                  {selectedTournament.bracket_type && (
                    <div className="info-item">
                      <span className="info-label">🏆 Format</span>
                      <span className="info-value">{selectedTournament.bracket_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  )}
                  {selectedTournament.registration_deadline && (
                    <div className="info-item">
                      <span className="info-label">⏰ Deadline</span>
                      <span className="info-value">{new Date(selectedTournament.registration_deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Entry fee & payment info */}
                {(selectedTournament.fee > 0 || selectedTournament.prize_pool > 0) && (
                  <div className="tournament-payment-info">
                    {selectedTournament.fee > 0 && (
                      <div className="payment-card">
                        <span className="payment-label">💰 Entry Fee</span>
                        <span className="payment-amount">KSh {selectedTournament.fee.toLocaleString()}</span>
                        {selectedTournament.service_fee > 0 && (
                          <span className="payment-service">+ KSh {selectedTournament.service_fee.toLocaleString()} service fee</span>
                        )}
                        {selectedTournament.service_fee > 0 && (
                          <span className="payment-total">Total: KSh {(selectedTournament.fee + selectedTournament.service_fee).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    {selectedTournament.prize_pool > 0 && (
                      <div className="payment-card prize">
                        <span className="payment-label">🏆 Prize Pool</span>
                        <span className="payment-amount">KSh {selectedTournament.prize_pool.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rules */}
                {selectedTournament.rules && (
                  <div className="tournament-rules">
                    <h3 className="subsection-title">📋 Rules</h3>
                    <p className="rules-text">{selectedTournament.rules}</p>
                  </div>
                )}

                {message && (
                  <div className={`auth-error ${message.type === 'success' ? 'auth-success' : ''}`}>
                    {message.text}
                  </div>
                )}

                {/* Register Now button */}
                {isRegistered ? (
                  <div className="registered-badge">✅ You are registered for this tournament</div>
                ) : (
                  ['registration_open'].includes(selectedTournament.status) ||
                  selectedTournament.late_registration_open
                ) ? (
                  <button
                    className="btn btn-primary register-btn"
                    onClick={() => handleRegister(selectedTournament.id)}
                    disabled={regLoading}
                  >
                    {regLoading ? 'Registering...' : selectedTournament.fee > 0
                      ? `🎾 Register Now — KSh ${(selectedTournament.fee + (selectedTournament.service_fee || 0)).toLocaleString()}`
                      : '🎾 Register Now — Free'}
                  </button>
                ) : (
                  <div className="info-badge">Registration is currently closed</div>
                )}

                {myMatches.length > 0 && (
                  <div className="my-matches-section">
                    <h3 className="section-title">Your Matches</h3>
                    <div className="match-cards">
                      {myMatches.map((match) => (
                        <div key={match.id} className={`match-card ${match.status === 'completed' ? 'match-completed' : ''}`}>
                          <div className="match-players">
                            <span className={match.winner_id === match.player1_id ? 'winner' : ''}>
                              {match.player1_name || 'TBD'}
                            </span>
                            <span className="vs">vs</span>
                            <span className={match.winner_id === match.player2_id ? 'winner' : ''}>
                              {match.player2_name || 'TBD'}
                            </span>
                          </div>
                          {match.status === 'completed' && (
                            <div className="match-score">
                              <span className="score">{match.score_player1} - {match.score_player2}</span>
                              {match.winner_name && <span className="winner-label">🏆 {match.winner_name}</span>}
                            </div>
                          )}
                          {match.scheduled_at && (
                            <div className="match-footer">
                              <span className="match-time">🕐 {new Date(match.scheduled_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div className="tab-content" data-testid="tab-matches">
            <div className="tab-header">
              <h2 className="section-title">My Matches</h2>
            </div>
            {selectedTournament && myMatches.length > 0 ? (
              <div className="match-cards">
                {myMatches.map((match) => (
                  <div key={match.id} className={`match-card ${match.status === 'completed' ? 'match-completed' : ''}`}>
                    <div className="match-players">
                      <span className={match.winner_id === match.player1_id ? 'winner' : ''}>
                        {match.player1_name || 'TBD'}
                      </span>
                      <span className="vs">vs</span>
                      <span className={match.winner_id === match.player2_id ? 'winner' : ''}>
                        {match.player2_name || 'TBD'}
                      </span>
                    </div>
                    {match.status === 'completed' && (
                      <div className="match-score">
                        <span className="score">{match.score_player1} - {match.score_player2}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-sm">
                <p>No matches yet.</p>
                <p>Register for a tournament to see your matches here!</p>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="tab-content" data-testid="tab-notifications">
            <div className="tab-header">
              <h2 className="section-title">Notifications</h2>
            </div>
            <div className="notifications-list">
              {upcomingTournaments.length > 0 ? (
                upcomingTournaments.map(t => (
                  <div key={t.id} className="notification-card">
                    <div className="notification-icon">🏆</div>
                    <div className="notification-body">
                      <div className="notification-title">{t.name}</div>
                      <div className="notification-text">
                        {t.status === 'registration_open' ? 'Registration is open! Sign up now.' : 'Tournament is in progress.'}
                      </div>
                      {t.date && <div className="notification-time">📅 {new Date(t.date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-sm">No new notifications</div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="tab-content" data-testid="tab-profile">
            <div className="tab-header">
              <h2 className="section-title">Profile</h2>
            </div>
            <div className="profile-card">
              <div className="profile-avatar">🎾</div>
              <h3 className="profile-name">{user.name}</h3>
              <p className="profile-email">{user.email}</p>
              <span className="profile-role">{user.role === 'player' ? 'Player' : user.role === 'host' ? 'Host / Player' : 'Referee / Player'}</span>
            </div>
            <div className="profile-actions">
              {hasManagementRole && (
                <button className="btn btn-primary" onClick={() => { switchToManagement(); }}>
                  Switch to {user.role === 'host' ? '🏟️ Host' : '📋 Referee'} Dashboard
                </button>
              )}
              <button className="btn btn-danger" onClick={logout}>Logout</button>
            </div>
          </div>
        )}
      </main>

      {/* 5-tab bottom navigation */}
      <nav className="bottom-nav" role="tablist" aria-label="Player navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
