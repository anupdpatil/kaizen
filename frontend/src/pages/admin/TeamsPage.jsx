import { useState } from 'react';
import { teamsAPI } from '../../utils/api.js';

function TeamsPage({ appState, updateState }) {
  const [newTeam, setNewTeam] = useState({ 
    contestId: '', teamCode: '', teamName: '', assignedDay: 1, hallId: 1 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedContest = appState.contests?.find(contest => contest.id === newTeam.contestId);
  const maxDayForContest = selectedContest?.days || 1;
  const maxHallForContest = selectedContest?.hallCount || 1;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeam.contestId) {
      setError('Please select a contest');
      return;
    }

    if (!selectedContest) {
      setError('Selected contest is no longer available');
      return;
    }

    if (newTeam.assignedDay < 1 || newTeam.assignedDay > selectedContest.days) {
      setError(`Day must be between 1 and ${selectedContest.days} for the selected contest.`);
      return;
    }

    if (newTeam.hallId < 1 || newTeam.hallId > selectedContest.hallCount) {
      setError(`Hall must be between 1 and ${selectedContest.hallCount} for the selected contest.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await teamsAPI.create(newTeam);
      const updated = [...appState.teams, response.data];
      updateState({ teams: updated });
      setNewTeam({ contestId: '', teamCode: '', teamName: '', assignedDay: 1, hallId: 1 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team? This cannot be undone.')) return;

    try {
      await teamsAPI.delete(id);
      const updated = appState.teams.filter(t => t.id !== id);
      updateState({ teams: updated });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await teamsAPI.update(id, updates);
      const updated = appState.teams.map(t => t.id === id ? { ...t, ...updates } : t);
      updateState({ teams: updated });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update team');
    }
  };

  return (
    <div>
      <h2>Team Management</h2>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="card mb-3">
        <h3>Add Team</h3>
        <form onSubmit={handleCreate} style={{ maxWidth: '600px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="required">Contest</label>
              <select
                value={newTeam.contestId}
                onChange={(e) => {
                  const contest = appState.contests?.find(c => c.id === e.target.value);
                  setNewTeam({
                    ...newTeam,
                    contestId: e.target.value,
                    assignedDay: contest ? Math.min(newTeam.assignedDay || 1, contest.days) : 1,
                    hallId: contest ? Math.min(newTeam.hallId || 1, contest.hallCount) : 1
                  });
                }}
                required
                disabled={loading}
              >
                <option value="">Select contest</option>
                {appState.contests?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="required">Team Code</label>
              <input
                type="text"
                value={newTeam.teamCode}
                onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value })}
                placeholder="e.g., T01D01"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="required">Team Name</label>
              <input
                type="text"
                value={newTeam.teamName}
                onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="required">Day</label>
              <input
                type="number"
                value={newTeam.assignedDay}
                onChange={(e) => {
                  const nextValue = parseInt(e.target.value) || 1;
                  const validValue = selectedContest ? Math.min(Math.max(nextValue, 1), selectedContest.days) : nextValue;
                  setNewTeam({ ...newTeam, assignedDay: validValue });
                }}
                min="1"
                max={maxDayForContest}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="required">Hall</label>
              <input
                type="number"
                value={newTeam.hallId}
                onChange={(e) => {
                  const nextValue = parseInt(e.target.value) || 1;
                  const validValue = selectedContest ? Math.min(Math.max(nextValue, 1), selectedContest.hallCount) : nextValue;
                  setNewTeam({ ...newTeam, hallId: validValue });
                }}
                min="1"
                max={maxHallForContest}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Add Team'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Teams</h3>
        {appState.teams && appState.teams.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Day</th>
                <th>Hall</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appState.teams.filter(t => !t.isDeleted).map(team => (
                <tr key={team.id}>
                  <td>{team.teamCode}</td>
                  <td><strong>{team.teamName}</strong></td>
                  <td>{team.assignedDay}</td>
                  <td>{team.hallId}</td>
                  <td>✓ Active</td>
                  <td>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(team.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No teams</p>
        )}
      </div>
    </div>
  );
}

export default TeamsPage;
