import { calculateTeamScore } from '../../utils/helpers.js';

function RankingsPage({ appState }) {
  const rankings = appState.teams
    ?.filter(t => !t.isDeleted)
    .map(t => ({
      team: t,
      score: calculateTeamScore(appState.evaluations, t.id)
    }))
    .filter(r => r.score !== null)
    .sort((a, b) => b.score - a.score) || [];

  return (
    <div>
      <h2>Rankings</h2>

      <div className="card">
        <h3>Overall Rankings</h3>
        {rankings.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Hall</th>
                <th>Day</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, idx) => (
                <tr key={r.team.id}>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    #{idx + 1}
                    {idx === 0 && ' 🥇'}
                    {idx === 1 && ' 🥈'}
                    {idx === 2 && ' 🥉'}
                  </td>
                  <td><strong>{r.team.teamName}</strong></td>
                  <td>{r.team.hallId}</td>
                  <td>{r.team.assignedDay}</td>
                  <td style={{ fontWeight: 'bold' }}>{r.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No completed evaluations yet</p>
        )}
      </div>
    </div>
  );
}

export default RankingsPage;
