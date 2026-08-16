import { useMemo, useState } from 'react';
import { teamsAPI } from '../../utils/api.js';
import { showToast } from '../../utils/notify.js';
import { TEAM_CATEGORIES } from '../../constants/teamCategories.js';

const TEAM_CATEGORY_OPTIONS = Object.keys(TEAM_CATEGORIES);

function TeamsPage({ appState, updateState }) {
  const [newTeam, setNewTeam] = useState({ 
    contestId: '', teamName: '', organisationName: '', category: TEAM_CATEGORY_OPTIONS[0], assignedDay: 1, hallId: 1 
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'teamName', direction: 'asc' });
  const pageSize = 5;

  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = (appState.teams || [])
      .filter(team => {
        if (!term) return !team.isDeleted;
        return (!team.isDeleted) && [team.teamCode || '', team.teamName || '', team.organisationName || '', team.category || '', String(team.hallId), String(team.assignedDay)]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        const aValue = sortConfig.key === 'evaluationType' ? (TEAM_CATEGORIES[a.category] || 'Other') : (a[sortConfig.key] ?? '');
        const bValue = sortConfig.key === 'evaluationType' ? (TEAM_CATEGORIES[b.category] || 'Other') : (b[sortConfig.key] ?? '');
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [appState.teams, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize));
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

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

    if (!newTeam.teamName?.trim()) {
      setError('Team Name is required');
      return;
    }

    if (!newTeam.organisationName?.trim()) {
      setError('Organisation Name is required');
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
      const payload = {
        contestId: newTeam.contestId,
        teamCode: newTeam.teamName.trim().replace(/\s+/g, '-').toUpperCase(),
        teamName: newTeam.teamName.trim(),
        organisationName: newTeam.organisationName.trim(),
        category: newTeam.category || TEAM_CATEGORY_OPTIONS[0],
        assignedDay: newTeam.assignedDay,
        hallId: newTeam.hallId
      };

      const response = await teamsAPI.create(payload);
      const updated = [...appState.teams, response.data];
      updateState({ teams: updated });
      showToast('Team created successfully', 'success');
      setNewTeam({ contestId: '', teamName: '', organisationName: '', category: TEAM_CATEGORY_OPTIONS[0], assignedDay: 1, hallId: 1 });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const team = (appState.teams || []).find(t => t.id === id);
    const teamName = team?.teamName || team?.teamCode || 'this team';
    const organisationName = team?.organisationName || 'this organisation';
    const category = team?.category || 'this category';

    if (!window.confirm(`Delete team "${teamName}" from ${organisationName} (${category})? This action cannot be undone.`)) {
      return;
    }

    try {
      await teamsAPI.delete(id);
      const updated = appState.teams.filter(t => t.id !== id);
      updateState({ teams: updated });
      showToast('Team deleted successfully', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await teamsAPI.update(id, updates);
      const updated = appState.teams.map(t => t.id === id ? { ...t, ...updates } : t);
      updateState({ teams: updated });
      showToast('Team updated successfully', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update team');
    }
  };

  return (
    <div>
      <h2>Team Management</h2>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%' }}>
        <div className="card mb-3" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Add Team</h3>
            {showForm && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            )}
          </div>

          {!showForm ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError('');
                setShowForm(true);
              }}
            >
              Add Team
            </button>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
              {error && <div className="alert alert-error mb-3" style={{ gridColumn: '1 / -1' }}>{error}</div>}

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
                <label className="required">Team Name</label>
                <input
                  type="text"
                  value={newTeam.teamName}
                  onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                  placeholder="e.g., Team Kaizen"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Organisation Name</label>
                <input
                  type="text"
                  value={newTeam.organisationName}
                  onChange={(e) => setNewTeam({ ...newTeam, organisationName: e.target.value })}
                  placeholder="e.g., InspiringMinds Labs"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Category</label>
                <select
                  value={newTeam.category}
                  onChange={(e) => setNewTeam({ ...newTeam, category: e.target.value })}
                  required
                  disabled={loading}
                >
                  {TEAM_CATEGORY_OPTIONS.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
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

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Add Team'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h3>Teams</h3>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search teams..."
            />
          </div>

          {filteredTeams.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>Team Name {sortConfig.key === 'teamName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('organisationName')} style={{ cursor: 'pointer' }}>Organisation {sortConfig.key === 'organisationName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>Category {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('evaluationType')} style={{ cursor: 'pointer' }}>Evaluation Type {sortConfig.key === 'evaluationType' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('assignedDay')} style={{ cursor: 'pointer' }}>Day {sortConfig.key === 'assignedDay' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('hallId')} style={{ cursor: 'pointer' }}>Hall {sortConfig.key === 'hallId' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTeams.map(team => (
                      <tr key={team.id}>
                        <td><strong>{team.teamName || team.teamCode || 'Unnamed Team'}</strong></td>
                        <td>{team.organisationName || team.teamName || 'N/A'}</td>
                        <td>{team.category || 'Other'}</td>
                        <td>{TEAM_CATEGORIES[team.category] || 'Other'}</td>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
                <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>
                  Prev
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>
                  Next
                </button>
              </div>
            </>
          ) : (
            <p>No teams match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamsPage;
