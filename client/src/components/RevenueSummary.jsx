export default function RevenueSummary({ dashboard }) {
  return (
    <div className="revenue-summary">
      <div className="stat-card">
        <h3>{dashboard.total_tournaments}</h3>
        <p>Total Tournaments</p>
      </div>
      <div className="stat-card">
        <h3>{dashboard.active_tournaments}</h3>
        <p>Active Tournaments</p>
      </div>
      <div className="stat-card">
        <h3>{dashboard.players_registered}</h3>
        <p>Players Registered</p>
      </div>
      <div className="stat-card">
        <h3>${dashboard.total_revenue.toFixed(2)}</h3>
        <p>Total Revenue</p>
      </div>
    </div>
  );
}
