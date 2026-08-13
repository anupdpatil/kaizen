import { useState } from 'react';
import { contestsAPI } from '../../utils/api.js';

function SetupPage({ appState, updateState }) {
  const getEmptyForm = () => ({
    name: '',
    code: '',
    startDate: new Date().toISOString().split('T')[0],
    days: '',
    hallCount: ''
  });

  const [formData, setFormData] = useState(getEmptyForm());
  const [editingContestId, setEditingContestId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishError, setPublishError] = useState('');

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingContestId(null);
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
      } else {
        const response = await contestsAPI.create(formData);
        const newContests = [...(appState.contests || []), response.data];
        updateState({ contests: newContests });
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
    setFormData({
      name: contest.name,
      code: contest.code,
      startDate: contest.startDate,
      days: contest.days,
      hallCount: contest.hallCount
    });
  };

  const handleDelete = async (contestId) => {
    try {
      setError('');
      await contestsAPI.delete(contestId);
      const updatedContests = (appState.contests || []).filter(contest => contest.id !== contestId);
      updateState({ contests: updatedContests });
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
    } catch (err) {
      setPublishError(err.response?.data?.error || 'Failed to unpublish contest');
    }
  };

  return (
    <div>
      <h2>Setup</h2>
      <p>Create and manage competition contests</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card">
          <h3>{editingContestId ? 'Edit Contest' : 'Create Contest'}</h3>
          {error && <div className="alert alert-error mb-3">{error}</div>}

          {editingContestId && (
            <button type="button" className="btn btn-secondary btn-sm mb-3" onClick={resetForm}>
              Cancel Edit
            </button>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
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

            <div className="form-group">
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

            <div className="form-group">
              <label className="required">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
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

            <div className="form-group">
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

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? (editingContestId ? 'Updating...' : 'Creating...') : (editingContestId ? 'Update Contest' : 'Create Contest')}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Active Contests</h3>
          {publishError && <div className="alert alert-error mb-3">{publishError}</div>}
          {appState.contests && appState.contests.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Days</th>
                  <th>Halls</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appState.contests.map(contest => (
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
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No contests yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupPage;
