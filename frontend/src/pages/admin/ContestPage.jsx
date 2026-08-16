import { useMemo, useState } from 'react';
import { contestsAPI } from '../../utils/api.js';
import { showToast } from '../../utils/notify.js';

function ContestPage({ appState, updateState }) {
  const getEmptyForm = () => ({
    name: '',
    code: '',
    startDate: new Date().toISOString().split('T')[0],
    days: '',
    hallCount: ''
  });

  const [formData, setFormData] = useState(getEmptyForm());
  const [editingContestId, setEditingContestId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const pageSize = 5;

  const filteredContests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = (appState.contests || [])
      .filter(contest => {
        if (!term) return true;
        return [contest.name, contest.code, String(contest.days), String(contest.hallCount)]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        const aValue = sortConfig.key === 'status' ? (a.published ? 'published' : 'draft') : (a[sortConfig.key] ?? '');
        const bValue = sortConfig.key === 'status' ? (b.published ? 'published' : 'draft') : (b[sortConfig.key] ?? '');
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [appState.contests, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredContests.length / pageSize));
  const paginatedContests = filteredContests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingContestId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingContestId) {
        const response = await contestsAPI.update(editingContestId, formData);
        const updatedContests = (appState.contests || []).map(contest =>
          contest.id === editingContestId ? response.data : contest
        );
        updateState({ contests: updatedContests });
        showToast('Contest updated successfully', 'success');
      } else {
        const response = await contestsAPI.create(formData);
        const newContests = [...(appState.contests || []), response.data];
        updateState({ contests: newContests });
        showToast('Contest created successfully', 'success');
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || (editingContestId ? 'Failed to update contest' : 'Failed to create contest'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contest) => {
    setEditingContestId(contest.id);
    setShowForm(true);
    setError('');
    setFormData({
      name: contest.name,
      code: contest.code,
      startDate: contest.startDate,
      days: contest.days,
      hallCount: contest.hallCount
    });
  };

  const handleDelete = async (contestId) => {
    const contest = (appState.contests || []).find(item => item.id === contestId);
    const contestName = contest?.name || 'this contest';

    if (!window.confirm(`Delete contest "${contestName}"? This will remove the contest and related records. This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      await contestsAPI.delete(contestId);
      const updatedContests = (appState.contests || []).filter(contest => contest.id !== contestId);
      updateState({ contests: updatedContests });
      showToast('Contest deleted successfully', 'success');
      if (editingContestId === contestId) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete contest');
    }
  };

  const handlePublish = async (contestId) => {
    try {
      setPublishError('');
      const response = await contestsAPI.publish(contestId);
      const updatedContests = (appState.contests || []).map(contest =>
        contest.id === contestId ? response.data : contest
      );
      updateState({ contests: updatedContests });
      showToast('Contest published successfully', 'success');
    } catch (err) {
      setPublishError(err.response?.data?.error || 'Failed to publish contest');
    }
  };

  const handleUnpublish = async (contestId) => {
    try {
      setPublishError('');
      const response = await contestsAPI.unpublish(contestId);
      const updatedContests = (appState.contests || []).map(contest =>
        contest.id === contestId ? response.data : contest
      );
      updateState({ contests: updatedContests });
      showToast('Contest unpublished successfully', 'info');
    } catch (err) {
      setPublishError(err.response?.data?.error || 'Failed to unpublish contest');
    }
  };

  return (
    <div>
      <h2>Contests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%' }}>
        <div className="card" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{editingContestId ? 'Edit Contest' : 'Create Contest'}</h3>
            {showForm && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
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
                setFormData(getEmptyForm());
                setEditingContestId(null);
                setShowForm(true);
              }}
            >
              Add Contest
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {error && <div className="alert alert-error mb-3" style={{ gridColumn: '1 / -1' }}>{error}</div>}

              <div className="form-group" style={{ gridColumn: '1 / span 2', minWidth: 0 }}>
                <label className="required">Contest Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kaizen 2026"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '3 / span 2', minWidth: 0 }}>
                <label className="required">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., KC2026"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Days</label>
                <input
                  type="number"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                  min="1"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Halls</label>
                <input
                  type="number"
                  value={formData.hallCount}
                  onChange={(e) => setFormData({ ...formData, hallCount: parseInt(e.target.value) })}
                  min="1"
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (editingContestId ? 'Updating...' : 'Creating...') : (editingContestId ? 'Update Contest' : 'Create Contest')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card" style={{ width: '100%' }}>
          <h3>Active Contests</h3>
          {publishError && <div className="alert alert-error mb-3">{publishError}</div>}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search contests..."
            />
          </div>

          {filteredContests.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>Code {sortConfig.key === 'code' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('days')} style={{ cursor: 'pointer' }}>Days {sortConfig.key === 'days' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('hallCount')} style={{ cursor: 'pointer' }}>Halls {sortConfig.key === 'hallCount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContests.map(contest => (
                      <tr key={contest.id}>
                        <td><strong>{contest.name}</strong></td>
                        <td>{contest.code}</td>
                        <td>{contest.days}</td>
                        <td>{contest.hallCount}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: contest.published ? '#d4edda' : '#fff3cd',
                            color: contest.published ? '#155724' : '#856404'
                          }}>
                            {contest.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleEdit(contest)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDelete(contest.id)}>
                              Delete
                            </button>
                            {!contest.published && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePublish(contest.id)}>
                                Publish
                              </button>
                            )}
                            {contest.published && (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleUnpublish(contest.id)}>
                                Unpublish
                              </button>
                            )}
                          </div>
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
            <p style={{ color: 'var(--text-secondary)' }}>No contests match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContestPage;
