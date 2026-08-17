import { useState } from 'react';
import { evaluationsAPI } from '../utils/api.js';
import PasswordChangeModal from '../components/PasswordChangeModal.jsx';
import { TEAM_CATEGORIES } from '../constants/teamCategories.js';
import { CATEGORY_WISE_EVALUATION_CRITERIA } from '../constants/categoryWiseEvaluationCriteria.js';
import { calculateWeightedTotal, getActiveContestId } from '../utils/helpers.js';
import '../styles/jury.css';

function JuryDashboard({ user, appState, updateState, onLogout, syncError, forcePasswordChange = false, onPasswordChanged }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [scores, setScores] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(forcePasswordChange);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationSummary, setConfirmationSummary] = useState(null);

  if (forcePasswordChange) {
    return (
      <div className="jury-layout">
        <header className="jury-header">
          <h1>Kaizen Jury Dashboard</h1>
          <div className="header-right">
            <span className="user-badge">
              <strong>{user.username}</strong>
              <small>(Jury)</small>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="jury-content">
          <div className="alert alert-warning mb-3">
            You must change your default password before continuing.
          </div>
        </main>

        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => {
            if (!forcePasswordChange) setShowPasswordModal(false);
          }}
          user={user}
          forceChange={true}
          onSuccess={() => {
            if (onPasswordChanged) {
              onPasswordChanged({ ...user, mustChangePassword: false });
            }
            setShowPasswordModal(false);
          }}
        />
      </div>
    );
  }

  const activeContestId = getActiveContestId(appState);

  // Get assigned halls for this jury for the active contest
  const assignedHalls = appState.hall_assignments
    ?.filter(a => a.contestId === activeContestId && a.juryIds.includes(user.id))
    .map(a => ({ day: a.day, hallId: a.hallId, contestId: a.contestId })) || [];

  // Get pending and submitted teams for assigned halls in the active contest
  const assignedTeams = appState.teams
    ?.filter(t => !t.isDeleted && t.contestId === activeContestId)
    .filter(t => assignedHalls.some(h => h.hallId === t.hallId && h.day === t.assignedDay)) || [];

  const pendingTeams = assignedTeams.filter(t => {
    const teamEvals = appState.evaluations[t.id] || {};
    return !teamEvals[user.id];
  });

  const submittedTeams = assignedTeams.filter(t => {
    const teamEvals = appState.evaluations[t.id] || {};
    return !!teamEvals[user.id];
  });

  const selectedTeamCategoryGroup = selectedTeam ? TEAM_CATEGORIES[selectedTeam.category] || 'Allied Case Study' : 'Allied Case Study';
  const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[selectedTeamCategoryGroup] || [];
  const selectedTeamSubmission = selectedTeam ? (appState.evaluations?.[selectedTeam.id]?.[user.id] || null) : null;

  const validateScores = () => {
    for (const criterion of criteria) {
      const criterionName = criterion.criterion;
      if (!scores[criterionName] || scores[criterionName] === '') {
        setError(`Please score ${criterionName}`);
        return false;
      }
    }
    return true;
  };

  const handleReviewSubmission = () => {
    if (!selectedTeam) return;
    if (!validateScores()) return;

    const scoreObj = {};
    for (const criterion of criteria) {
      const criterionName = criterion.criterion;
      const value = parseInt(scores[criterionName], 10);
      scoreObj[criterionName] = value;
    }

    const total = calculateWeightedTotal(scoreObj, criteria);

    setConfirmationSummary({
      teamName: selectedTeam.teamName,
      organisationName: selectedTeam.organisationName || 'N/A',
      category: selectedTeam.category || 'Other',
      hallId: selectedTeam.hallId,
      assignedDay: selectedTeam.assignedDay,
      total: Number(total.toFixed(2)),
      scores: scoreObj
    });
    setError('');
    setShowConfirmation(true);
  };

  const handleConfirmSubmission = async () => {
    if (!selectedTeam || !confirmationSummary) return;

    setError('');
    setLoading(true);

    try {
      const response = await evaluationsAPI.submit({
        teamId: selectedTeam.id,
        juryId: user.id,
        contestId: selectedTeam.contestId,
        scores: confirmationSummary.scores,
        total: confirmationSummary.total
      });

      const newEvals = { ...appState.evaluations };
      if (!newEvals[selectedTeam.id]) newEvals[selectedTeam.id] = {};
      newEvals[selectedTeam.id][user.id] = response.data.evaluation;
      updateState({ evaluations: newEvals });

      setScores({});
      setSelectedTeam(null);
      setConfirmationSummary(null);
      setShowConfirmation(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit scores');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jury-layout">
      <header className="jury-header">
        <h1>Kaizen Jury Dashboard</h1>
        <div className="header-right">
          <span className="user-badge">
            <strong>{user.username}</strong>
            <small>(Jury)</small>
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>
            Change Password
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="jury-content">
        {syncError && (
          <div className="alert alert-error mb-3">
            <strong>Sync Error:</strong> {syncError}
          </div>
        )}

        {submitted && (
          <div className="alert alert-success mb-3">
            ✓ Scores submitted successfully!
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
          {/* Team Queue */}
          <div className="card">
            <div className="team-section">
              <h3>Pending Teams</h3>
              {pendingTeams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {pendingTeams.map(team => (
                    <button
                      key={team.id}
                      className={`team-btn ${selectedTeam?.id === team.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTeam(team);
                        setScores({});
                        setError('');
                        setShowConfirmation(false);
                        setConfirmationSummary(null);
                      }}
                    >
                      <strong>{team.teamName}</strong>
                      <small>{team.organisationName || 'N/A'}</small>
                      <small>{team.category || 'Other'} • Hall {team.hallId}, Day {team.assignedDay}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No pending teams</p>
              )}
            </div>

            <div className="team-section">
              <h3>Submitted Teams</h3>
              {submittedTeams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {submittedTeams.map(team => {
                    const submission = appState.evaluations?.[team.id]?.[user.id];
                    const totalScore = submission?.total ?? 0;

                    return (
                      <button
                        key={team.id}
                        className={`team-btn submitted ${selectedTeam?.id === team.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTeam(team);
                          setScores({});
                          setError('');
                          setShowConfirmation(false);
                          setConfirmationSummary(null);
                        }}
                      >
                        <strong>{team.teamName}</strong>
                        <small>{team.organisationName || 'N/A'}</small>
                        <small>{team.category || 'Other'} • Hall {team.hallId}, Day {team.assignedDay}</small>
                        <div className="submitted-meta">
                          <span className="submitted-badge">Submitted</span>
                          <span className="submitted-score">Total: {totalScore}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No submitted teams</p>
              )}
            </div>
          </div>

          {/* Scoring Form */}
          <div className="card">
            {selectedTeam ? (
              <>
                <h3>{selectedTeam.teamName}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {selectedTeam.organisationName || 'N/A'}
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '0.75rem', padding: '4px 10px', borderRadius: '999px', background: 'rgba(0, 139, 139, 0.08)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem' }}>
                  {selectedTeamCategoryGroup}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedTeam.category || 'Other'} • Hall {selectedTeam.hallId} • Day {selectedTeam.assignedDay}
                </p>

                {error && <div className="alert alert-error mb-3">{error}</div>}

                {selectedTeamSubmission ? (
                  <div className="submission-summary">
                    <div className="alert alert-success mb-3">
                      Your submitted result for this team is locked. You can review it below but cannot edit it.
                    </div>

                    <div className="submission-total">Total Score: {selectedTeamSubmission.total || 0}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                      {criteria.map(({ criterion, weightage }) => (
                        <div key={criterion} className="form-group">
                          <label style={{ fontSize: '0.875rem' }}>{criterion} ({weightage}%)</label>
                          <div className="score-readonly-box">
                            {selectedTeamSubmission.scores?.[criterion] ?? '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                      {criteria.map(({ criterion, weightage }) => (
                        <div key={criterion} className="form-group">
                          <label className="required" style={{ fontSize: '0.875rem' }}>
                            {criterion} ({weightage}%)
                          </label>
                          <select
                            value={scores[criterion] || ''}
                            onChange={(e) => setScores({ ...scores, [criterion]: e.target.value })}
                            disabled={loading}
                          >
                            <option value="">Select (0-10)</option>
                            {Array.from({ length: 11 }, (_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-primary btn-lg w-full"
                      onClick={handleReviewSubmission}
                      disabled={loading}
                      style={{ marginTop: 'var(--spacing-lg)' }}
                    >
                      {loading ? 'Submitting...' : 'Submit Scores'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                Select a team from the queue to score
              </p>
            )}
          </div>
        </div>
      </main>

      {showConfirmation && confirmationSummary && (
        <div className="confirmation-overlay">
          <div className="confirmation-card">
            <h3>Confirm ranking submission</h3>
            <p><strong>Team:</strong> {confirmationSummary.teamName}</p>
            <p><strong>Organisation:</strong> {confirmationSummary.organisationName}</p>
            <p><strong>Category:</strong> {confirmationSummary.category}</p>
            <p><strong>Hall:</strong> {confirmationSummary.hallId} <strong>Day:</strong> {confirmationSummary.assignedDay}</p>

            <div className="confirmation-summary-list">
              {criteria.map(({ criterion, weightage }) => (
                <div key={criterion} className="confirmation-row">
                  <span>{criterion} ({weightage}%)</span>
                  <strong>{confirmationSummary.scores[criterion]}</strong>
                </div>
              ))}
            </div>

            <div className="confirmation-total">
              <span>Total</span>
              <strong>{confirmationSummary.total}</strong>
            </div>

            <div className="confirmation-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)} disabled={loading}>
                Edit
              </button>
              <button className="btn btn-primary" onClick={handleConfirmSubmission} disabled={loading}>
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={user}
        onSuccess={() => {
          if (onPasswordChanged) {
            onPasswordChanged({ ...user, mustChangePassword: false });
          }
          setShowPasswordModal(false);
        }}
      />
    </div>
  );
}

export default JuryDashboard;
