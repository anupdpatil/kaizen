import { useState, useEffect } from 'react';
import { evaluationsAPI } from '../utils/api.js';
import '../styles/jury.css';

function JuryDashboard({ user, appState, updateState, onLogout, syncError }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [scores, setScores] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get assigned halls for this jury (only from published contests)
  const publishedContests = (appState.contests || []).filter(c => c.published);
  const assignedHalls = appState.hall_assignments
    ?.filter(a => a.juryIds.includes(user.id))
    .filter(a => publishedContests.some(c => c.id === a.contestId))
    .map(a => ({ day: a.day, hallId: a.hallId, contestId: a.contestId })) || [];

  // Get pending teams for assigned halls
  const pendingTeams = appState.teams
    ?.filter(t => !t.isDeleted)
    .filter(t => assignedHalls.some(h => h.hallId === t.hallId && h.day === t.assignedDay))
    .filter(t => {
      const teamEvals = appState.evaluations[t.id] || {};
      return !teamEvals[user.id]; // Not yet evaluated by this jury
    }) || [];

  const criteria = [
    'Problem Definition',
    'Root Cause Analysis',
    'Innovation',
    'Implementation Quality',
    'Measured Impact',
    'Sustainability',
    'Presentation Clarity',
    'Q&A Handling'
  ];

  const handleSubmitScores = async () => {
    if (!selectedTeam) return;

    // Validate all criteria filled
    for (const criterion of criteria) {
      if (!scores[criterion] || scores[criterion] === '') {
        setError(`Please score ${criterion}`);
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      const scoreObj = {};
      for (const criterion of criteria) {
        scoreObj[criterion] = parseInt(scores[criterion]);
      }

      const response = await evaluationsAPI.submit({
        teamId: selectedTeam.id,
        juryId: user.id,
        contestId: selectedTeam.contestId,
        scores: scoreObj
      });

      // Update local evaluations
      const newEvals = { ...appState.evaluations };
      if (!newEvals[selectedTeam.id]) newEvals[selectedTeam.id] = {};
      newEvals[selectedTeam.id][user.id] = response.data.evaluation;
      updateState({ evaluations: newEvals });

      setScores({});
      setSelectedTeam(null);
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
                    }}
                  >
                    <strong>{team.teamName}</strong>
                    <small>Hall {team.hallId}, Day {team.assignedDay}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No pending teams</p>
            )}
          </div>

          {/* Scoring Form */}
          <div className="card">
            {selectedTeam ? (
              <>
                <h3>{selectedTeam.teamName}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Hall {selectedTeam.hallId} • Day {selectedTeam.assignedDay}
                </p>

                {error && <div className="alert alert-error mb-3">{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  {criteria.map(criterion => (
                    <div key={criterion} className="form-group">
                      <label className="required" style={{ fontSize: '0.875rem' }}>
                        {criterion}
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
                  onClick={handleSubmitScores}
                  disabled={loading}
                  style={{ marginTop: 'var(--spacing-lg)' }}
                >
                  {loading ? 'Submitting...' : 'Submit Scores'}
                </button>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                Select a team from the queue to score
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default JuryDashboard;
