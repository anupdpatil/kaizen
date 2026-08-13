function ResultsPage({ appState }) {
  const [hallFilter, setHallFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  const results = appState.teams
    ?.filter(t => !t.isDeleted)
    .filter(t => !hallFilter || t.hallId === parseInt(hallFilter))
    .filter(t => !dayFilter || t.assignedDay === parseInt(dayFilter))
    .map(team => {
      const teamEvals = appState.evaluations[team.id] || {};
      const evals = Object.entries(teamEvals);
      const scores = evals.map(([, e]) => e.total);
      const avg = scores.length >= 2 ? ((scores[0] + scores[1]) / 2).toFixed(2) : '-';
      const jury = evals.map(([jid, e]) => {
        const juryName = appState.juries?.find(j => j.id === jid)?.name || 'Unknown';
        return { juryName, score: e.total };
      });

      return {
        team,
        jury1: jury[0]?.juryName || '-',
        score1: jury[0]?.score || '-',
        jury2: jury[1]?.juryName || '-',
        score2: jury[1]?.score || '-',
        average: avg,
        status: evals.length >= 2 ? '✓ Complete' : '⏳ Pending'
      };
    }) || [];

  return (
    <div>
      <h2>Results</h2>

      <div className="card mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div>
            <label>Filter by Hall</label>
            <input
              type="number"
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              placeholder="All"
            />
          </div>
          <div>
            <label>Filter by Day</label>
            <input
              type="number"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              placeholder="All"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Hall</th>
              <th>Team</th>
              <th>Jury 1</th>
              <th>Score 1</th>
              <th>Jury 2</th>
              <th>Score 2</th>
              <th>Average</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.team.id}>
                <td>{r.team.assignedDay}</td>
                <td>{r.team.hallId}</td>
                <td><strong>{r.team.teamName}</strong></td>
                <td>{r.jury1}</td>
                <td>{r.score1}</td>
                <td>{r.jury2}</td>
                <td>{r.score2}</td>
                <td><strong>{r.average}</strong></td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';
export default ResultsPage;
