import { useState } from 'react';
import { assignmentsAPI } from '../../utils/api.js';

function AssignmentsPage({ appState, updateState }) {
  const [form, setForm] = useState({ contestId: '', day: 1, hallId: 1, juryIds: ['', ''] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedContest = appState.contests?.find(contest => contest.id === form.contestId);
  const maxDayForContest = selectedContest?.days || 1;
  const maxHallForContest = selectedContest?.hallCount || 1;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.contestId || !form.juryIds[0] || !form.juryIds[1]) {
      setError('Please fill all fields');
      return;
    }
    if (!selectedContest) {
      setError('Selected contest is no longer available');
      return;
    }
    if (form.day < 1 || form.day > selectedContest.days) {
      setError(`Day must be between 1 and ${selectedContest.days} for this contest.`);
      return;
    }
    if (form.hallId < 1 || form.hallId > selectedContest.hallCount) {
      setError(`Hall must be between 1 and ${selectedContest.hallCount} for this contest.`);
      return;
    }
    if (form.juryIds[0] === form.juryIds[1]) {
      setError('Must select 2 different juries');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await assignmentsAPI.create({
        contestId: form.contestId,
        day: form.day,
        hallId: form.hallId,
        juryIds: form.juryIds
      });
      const assignments = appState.hall_assignments || [];
      const existing = assignments.findIndex(a => a.id === response.data.id);
      let updated;
      if (existing >= 0) {
        updated = [...assignments];
        updated[existing] = response.data;
      } else {
        updated = [...assignments, response.data];
      }
      updateState({ hall_assignments: updated });
      setForm({ contestId: form.contestId, day: 1, hallId: 1, juryIds: ['', ''] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    try {
      setError('');
      await assignmentsAPI.delete(assignmentId);
      const updated = (appState.hall_assignments || []).filter(item => item.id !== assignmentId);
      updateState({ hall_assignments: updated });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete assignment');
    }
  };

  return (
    <div>
      <h2>Hall Assignment Management</h2>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="card mb-3">
        <h3>Assign Juries to Hall/Day</h3>
        <form onSubmit={handleAssign} style={{ maxWidth: '600px' }}>
          <div className="form-group">
            <label className="required">Contest</label>
            <select
              value={form.contestId}
              onChange={(e) => {
                const contest = appState.contests?.find(c => c.id === e.target.value);
                setForm({
                  ...form,
                  contestId: e.target.value,
                  day: contest ? Math.min(form.day || 1, contest.days) : 1,
                  hallId: contest ? Math.min(form.hallId || 1, contest.hallCount) : 1
                });
              }}
              required
            >
              <option value="">Select</option>
              {appState.contests?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="required">Day</label>
              <input
                type="number"
                value={form.day}
                onChange={(e) => {
                  const nextValue = parseInt(e.target.value) || 1;
                  const validValue = selectedContest ? Math.min(Math.max(nextValue, 1), selectedContest.days) : nextValue;
                  setForm({ ...form, day: validValue });
                }}
                min="1"
                max={maxDayForContest}
                required
              />
            </div>

            <div className="form-group">
              <label className="required">Hall</label>
              <select
                value={form.hallId}
                onChange={(e) => setForm({ ...form, hallId: parseInt(e.target.value) || 1 })}
                required
              >
                {Array.from({ length: maxHallForContest }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hall {h}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="required">Jury 1</label>
              <select
                value={form.juryIds[0]}
                onChange={(e) => setForm({ ...form, juryIds: [e.target.value, form.juryIds[1]] })}
                required
              >
                <option value="">Select</option>
                {appState.juries?.filter(j => !j.isDeleted && j.id !== form.juryIds[1]).map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="required">Jury 2</label>
              <select
                value={form.juryIds[1]}
                onChange={(e) => setForm({ ...form, juryIds: [form.juryIds[0], e.target.value] })}
                required
              >
                <option value="">Select</option>
                {appState.juries?.filter(j => !j.isDeleted && j.id !== form.juryIds[0]).map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Current Assignments</h3>
        {appState.hall_assignments && appState.hall_assignments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Contest</th>
                <th>Day</th>
                <th>Hall</th>
                <th>Jury 1</th>
                <th>Jury 2</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appState.hall_assignments.map(a => {
                const jury1 = appState.juries?.find(j => j.id === a.juryIds[0]);
                const jury2 = appState.juries?.find(j => j.id === a.juryIds[1]);
                return (
                  <tr key={a.id}>
                    <td>{appState.contests?.find(c => c.id === a.contestId)?.name}</td>
                    <td>{a.day}</td>
                    <td>{a.hallId}</td>
                    <td>{jury1?.name}</td>
                    <td>{jury2?.name}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(a.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No assignments</p>
        )}
      </div>
    </div>
  );
}

export default AssignmentsPage;
