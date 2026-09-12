import { useState } from 'react';
import {
  getActiveContestId,
  getCompletionPercentage,
  getHallCompletion
} from '../../utils/helpers.js';

function DashboardPage({ appState, onViewChange, onHallSelect }) {
  const [activeDashboardTab, setActiveDashboardTab] = useState('halls');
  const navigateTo = view => onViewChange?.(view);
  const openResults = hallId => onHallSelect?.(hallId || '');
  const activeContestId = getActiveContestId(appState);
  const activeContest = (appState.contests || []).find(contest => contest.id === activeContestId) || null;
  const completionPercent = getCompletionPercentage(appState, activeContestId);
  const scopedTeams = (appState.teams || []).filter(team =>
    !team.isDeleted && (!activeContestId || team.contestId === activeContestId)
  );
  const evaluations = appState.evaluations || {};
  const completedTeams = scopedTeams.filter(team => Object.keys(evaluations[team.id] || {}).length >= 2);
  const inProgressTeams = scopedTeams.filter(team => {
    const evaluationCount = Object.keys(evaluations[team.id] || {}).length;
    return evaluationCount > 0 && evaluationCount < 2;
  });
  const activeJuries = (appState.juries || []).filter(jury => !jury.isDeleted);
  const assignments = (appState.hall_assignments || []).filter(assignment =>
    !activeContestId || assignment.contestId === activeContestId
  );
  const days = Math.max(activeContest?.days || 1, 1);
  const halls = Math.max(activeContest?.hallCount || 1, 1);
  const expectedAssignments = days * halls;
  const assignmentPercent = expectedAssignments
    ? Math.min(100, Math.round((assignments.length / expectedAssignments) * 100))
    : 0;
  const categoryCount = new Set(scopedTeams.map(team => team.category).filter(Boolean)).size;

  const getDayStats = day => {
    const teams = scopedTeams.filter(team => team.assignedDay === day);
    const completed = teams.filter(team => Object.keys(evaluations[team.id] || {}).length >= 2).length;
    return { total: teams.length, completed };
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow"><span className="live-dot" /> Live operations overview</span>
          <h2>{activeContest ? activeContest.name : 'Dashboard'}</h2>
          <p>{activeContest ? `${activeContest.code || 'Active contest'} · Track every hall, jury and evaluation at a glance.` : 'Set up a contest to start tracking live progress.'}</p>
        </div>
        {activeContest && (
          <button className="hero-progress dashboard-route" type="button" onClick={() => openResults()}>
            <span>Overall progress</span>
            <strong>{completionPercent}%</strong>
            <div className="dashboard-progress"><i style={{ width: `${completionPercent}%` }} /></div>
            <small>{completedTeams.length} of {scopedTeams.length} teams fully evaluated</small>
            <em>Open results →</em>
          </button>
        )}
      </div>

      {!activeContest ? (
        <div className="card dashboard-empty">
          <span className="dashboard-empty-icon">🚀</span>
          <h3>Your command center is ready</h3>
          <p>Create or publish a contest to see teams, hall readiness, evaluation progress and live activity here.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-stat-grid">
            <button className="dashboard-stat-card stat-teal dashboard-route" type="button" onClick={() => navigateTo('teams')}><span className="stat-icon">🎯</span><div><small>Registered teams</small><strong>{scopedTeams.length}</strong><em>{categoryCount} categories · Open teams →</em></div></button>
            <button className="dashboard-stat-card stat-blue dashboard-route" type="button" onClick={() => openResults()}><span className="stat-icon">⚡</span><div><small>Evaluations complete</small><strong>{completedTeams.length}</strong><em>{inProgressTeams.length} in progress · Open results →</em></div></button>
            <button className="dashboard-stat-card stat-purple dashboard-route" type="button" onClick={() => navigateTo('juries')}><span className="stat-icon">👥</span><div><small>Active juries</small><strong>{activeJuries.length}</strong><em>{assignments.length} assignments · Open juries →</em></div></button>
            <button className="dashboard-stat-card stat-orange dashboard-route" type="button" onClick={() => navigateTo('assignments')}><span className="stat-icon">📍</span><div><small>Hall readiness</small><strong>{assignmentPercent}%</strong><em>{assignments.length} of {expectedAssignments} covered · Open assignments →</em></div></button>
          </div>

          <div className="dashboard-lower-grid">
            <section className="card dashboard-section dashboard-tab-section">
              <div className="section-heading">
                <div><span className="section-kicker">Operations view</span><h3>{activeDashboardTab === 'halls' ? 'Coverage map' : 'Evaluation runway'}</h3></div>
                <button className="dashboard-section-link" type="button" onClick={() => activeDashboardTab === 'halls' ? navigateTo('assignments') : openResults()}>{activeDashboardTab === 'halls' ? 'Open assignments →' : 'Open results →'}</button>
              </div>
              <div className="dashboard-tabs" role="tablist" aria-label="Dashboard progress views">
                <button className={activeDashboardTab === 'halls' ? 'active' : ''} onClick={() => setActiveDashboardTab('halls')} role="tab" aria-selected={activeDashboardTab === 'halls'}>Hallwise pulse</button>
                <button className={activeDashboardTab === 'days' ? 'active' : ''} onClick={() => setActiveDashboardTab('days')} role="tab" aria-selected={activeDashboardTab === 'days'}>Day-by-day progress</button>
              </div>
              {activeDashboardTab === 'halls' ? (
              <div className="hall-pulse-grid">
                {Array.from({ length: halls }, (_, index) => {
                  const hallId = index + 1;
                  const dayStats = Array.from({ length: days }, (_, day) => {
                    const stats = getHallCompletion(appState, hallId, day + 1, activeContestId);
                    return { total: stats.total, completed: stats.completed };
                  });
                  const completed = dayStats.reduce((sum, stats) => sum + stats.completed, 0);
                  const total = dayStats.reduce((sum, stats) => sum + stats.total, 0);
                  const percent = total ? Math.round((completed / total) * 100) : 0;
                  const hallName = activeContest.hallNames?.[hallId] || `Hall ${hallId}`;
                  return (
                    <button className="hall-pulse-card dashboard-route" type="button" key={`h${hallId}`} onClick={() => openResults(hallId)}>
                      <div className="hall-card-top"><span className="hall-number">H{hallId}</span><span className={`pulse-status ${percent === 100 && total > 0 ? 'done' : ''}`}>{percent === 100 && total > 0 ? 'Complete' : 'Active'}</span></div>
                      <strong>{hallName}</strong>
                      <div className="hall-total">{completed}<small> / {total} teams</small></div>
                      <div className="dashboard-progress"><i style={{ width: `${percent}%` }} /></div>
                      <div className="hall-day-row">{dayStats.map((stats, day) => <span key={day}>D{day + 1} <b>{stats.completed}/{stats.total}</b></span>)}</div>
                    </button>
                  );
                })}
              </div>
              ) : (
              <div className="day-progress-list">
                {Array.from({ length: days }, (_, index) => {
                  const stats = getDayStats(index + 1);
                  const percent = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return <button className="day-progress-item dashboard-route" type="button" key={index} onClick={() => openResults()}><div><span>Day {index + 1}</span><b>{percent}%</b></div><div className="dashboard-progress"><i style={{ width: `${percent}%` }} /></div><small>{stats.completed} completed · {Math.max(stats.total - stats.completed, 0)} remaining</small></button>;
                })}
              </div>
              )}
            </section>

            <section className="card dashboard-section">
              <div className="section-heading"><div><span className="section-kicker">At a glance</span><h3>Contest readiness</h3></div><button className="dashboard-section-link" type="button" onClick={() => navigateTo('setup')}>Open contest setup →</button></div>
              <div className="readiness-row"><span>Contest status</span><b className="ready-value">{activeContest.published ? 'Published' : 'Draft'}</b></div>
              <div className="readiness-row"><span>Jury coverage</span><b>{assignments.length ? `${assignments.length} assignments` : 'Needs setup'}</b></div>
              <div className="readiness-row"><span>Pending evaluations</span><b>{scopedTeams.length - completedTeams.length}</b></div>
              <div className="readiness-row"><span>Contest format</span><b>{days} day{days === 1 ? '' : 's'} · {halls} hall{halls === 1 ? '' : 's'}</b></div>
            </section>
          </div>

        </>
      )}
    </div>
  );
}

export default DashboardPage;
