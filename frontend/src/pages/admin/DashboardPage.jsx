import { getActiveContestId, getCompletionPercentage, getHallCompletion } from '../../utils/helpers.js';

function DashboardPage({ appState }) {
  const activeContestId = getActiveContestId(appState);
  const activeContest = (appState.contests || []).find(contest => contest.id === activeContestId) || null;
  const completionPercent = getCompletionPercentage(appState, activeContestId);

  return (
    <div>
      <h2>Dashboard</h2>

      {!activeContest ? (
        <div className="alert alert-info">No active contest</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3>Overall Completion</h3>
            <div style={{ fontSize: '2.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
              {completionPercent}%
            </div>
            <div className="progress-bar" style={{ 
              width: '100%', 
              height: '20px', 
              background: 'var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginTop: 'var(--spacing-md)'
            }}>
              <div style={{
                width: `${completionPercent}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Hallwise Completion</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            {Array.from({ length: activeContest.hallCount }, (_, i) => i + 1).map(hallId => {
              const hallName = activeContest.hallNames?.[hallId];
              const day1 = getHallCompletion(appState, hallId, 1);
              const day2 = getHallCompletion(appState, hallId, 2);
              const total = day1.completed + day2.completed;
              const totalTeams = day1.total + day2.total;
              const percent = totalTeams > 0 ? Math.round((total / totalTeams) * 100) : 0;

              return (
                <div key={`h${hallId}`} className="card">
                  <h4>{hallName || `Hall ${hallId}`}</h4>
                  {hallName && <small style={{ color: 'var(--text-secondary)' }}>Hall {hallId}</small>}
                  <div style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: 'var(--spacing-md)' }}>
                    {total}/{totalTeams}
                  </div>
                  <div className="progress-bar" style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: 'var(--primary)'
                    }} />
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>{percent}%</small>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
