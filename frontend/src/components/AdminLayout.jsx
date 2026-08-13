import '../styles/layout.css';

function AdminLayout({ user, currentView, onViewChange, onLogout, syncError, children }) {
  const views = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'contest', label: 'Contest', icon: '⚙️' },
    { id: 'juries', label: 'Juries', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '🎯' },
    { id: 'assignments', label: 'Assignments', icon: '📍' },
    { id: 'results', label: 'Results', icon: '📋' },
    { id: 'rankings', label: 'Rankings', icon: '🏆' },
    { id: 'exports', label: 'Exports', icon: '📥' },
    { id: 'activity', label: 'Activity', icon: '🧾' }
  ];

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Kaizen</h1>
            <p>Competition Management</p>
          </div>
          <div className="header-right">
            <span className="user-badge">
              <strong>{user.username}</strong>
              <small>({user.role})</small>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-container">
        <nav className="admin-nav">
          {views.map(view => (
            <button
              key={view.id}
              className={`nav-btn ${currentView === view.id ? 'active' : ''}`}
              onClick={() => onViewChange(view.id)}
            >
              <span className="nav-icon">{view.icon}</span>
              <span className="nav-label">{view.label}</span>
            </button>
          ))}
        </nav>

        <main className="admin-content">
          {syncError && (
            <div className="alert alert-error mb-3">
              <strong>Sync Error:</strong> {syncError}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
