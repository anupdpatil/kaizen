import { useState } from 'react';
import { juriesAPI } from '../../utils/api.js';

function JuriesPage({ appState, updateState }) {
  const [newJury, setNewJury] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await juriesAPI.create(newJury);
      const updated = [...appState.juries, response.data];
      updateState({ juries: updated });
      setNewJury({ name: '', username: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create jury');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this jury?')) return;

    try {
      await juriesAPI.delete(id);
      const updated = appState.juries.filter(j => j.id !== id);
      updateState({ juries: updated });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete jury');
    }
  };

  const handleToggleSoftDelete = async (jury) => {
    try {
      await juriesAPI.update(jury.id, { isDeleted: !jury.isDeleted });
      const updated = appState.juries.map(j => 
        j.id === jury.id ? { ...j, isDeleted: !j.isDeleted } : j
      );
      updateState({ juries: updated });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update jury');
    }
  };

  return (
    <div>
      <h2>Jury Management</h2>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="card mb-3">
        <h3>Add New Jury</h3>
        <form onSubmit={handleCreate} style={{ maxWidth: '400px' }}>
          <div className="form-group">
            <label className="required">Name</label>
            <input
              type="text"
              value={newJury.name}
              onChange={(e) => setNewJury({ ...newJury, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="required">Username</label>
            <input
              type="text"
              value={newJury.username}
              onChange={(e) => setNewJury({ ...newJury, username: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="required">Password</label>
            <input
              type="password"
              value={newJury.password}
              onChange={(e) => setNewJury({ ...newJury, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Add Jury'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Juries</h3>
        {appState.juries && appState.juries.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appState.juries.map(jury => (
                <tr key={jury.id} style={{ opacity: jury.isDeleted ? 0.6 : 1 }}>
                  <td><strong>{jury.name}</strong></td>
                  <td>{jury.username}</td>
                  <td>{jury.isDeleted ? '🗑️ Deleted' : '✓ Active'}</td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleSoftDelete(jury)}
                    >
                      {jury.isDeleted ? 'Restore' : 'Delete'}
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(jury.id)}
                      style={{ marginLeft: '4px' }}
                    >
                      Hard Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No juries</p>
        )}
      </div>
    </div>
  );
}

export default JuriesPage;
