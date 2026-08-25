import { formatActivitySummary, getActivityStats } from '../../utils/helpers.js';

const reconciliationActions = new Set([
  'paper_score_backfill',
  'normalize_backfill_timestamps',
  'adjust_backfill_pair_timestamps'
]);

const getActivityDisplay = (activity) => {
  if (reconciliationActions.has(activity.action)) {
    return { actor: 'System', role: 'administrative process', area: 'contest results' };
  }

  return {
    actor: activity.actor || 'System',
    role: activity.actorRole || 'system',
    area: activity.entityType
  };
};

function ActivityPage({ appState }) {
  const activities = appState.activity_logs || [];
  const stats = getActivityStats(activities);

  return (
    <div>
      <h2>Activity Monitor</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--spacing-md)', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Total recorded</small>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Logins</small>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.login}</div>
        </div>
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Creates</small>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.create}</div>
        </div>
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Assignments</small>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.assignment}</div>
        </div>
      </div>

      <div className="card">
        <h3>Audit trail</h3>

        {activities.length === 0 ? (
          <div className="text-muted">No activity has been recorded yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            {activities
              .slice()
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((activity) => {
                const display = getActivityDisplay(activity);
                activity = {
                  ...activity,
                  actor: display.actor,
                  actorRole: display.role,
                  entityType: display.area
                };

                return (
                  <div
                  key={activity.id || `${activity.createdAt}-${activity.action}`}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {formatActivitySummary(activity)}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {activity.actor || 'System'} · {activity.actorRole || 'system'} · {new Date(activity.createdAt).toLocaleString()}
                  </div>
                  {activity.entityType && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
                      Area: {activity.entityType}
                    </div>
                  )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityPage;
