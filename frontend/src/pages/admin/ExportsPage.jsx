import { calculateTeamScore } from '../../utils/helpers.js';

function ExportsPage({ appState }) {
  const downloadCSV = (filename, data) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => 
        Object.values(row)
          .map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v)
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportTeamWise = () => {
    const data = appState.teams
      ?.filter(t => !t.isDeleted)
      .map(t => {
        const score = calculateTeamScore(appState.evaluations, t.id);
        return {
          TeamCode: t.teamCode,
          TeamName: t.teamName,
          Hall: t.hallId,
          Day: t.assignedDay,
          Score: score ? score.toFixed(2) : '-'
        };
      }) || [];
    downloadCSV('team_wise_results.csv', data);
  };

  const exportHallWise = () => {
    const data = [];
    const contests = appState.contests || [];
    for (const contest of contests) {
      for (let hall = 1; hall <= contest.hallCount; hall++) {
        const hallTeams = appState.teams?.filter(t => t.hallId === hall && !t.isDeleted) || [];
        const scores = hallTeams
          .map(t => calculateTeamScore(appState.evaluations, t.id))
          .filter(s => s !== null);
        const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(2) : '-';
        data.push({
          Contest: contest.name,
          Hall: hall,
          TeamsCount: hallTeams.length,
          CompletedCount: scores.length,
          AverageScore: avgScore
        });
      }
    }
    downloadCSV('hall_wise_results.csv', data);
  };

  const exportConsolidated = () => {
    const data = appState.teams
      ?.filter(t => !t.isDeleted)
      .map(t => {
        const teamEvals = appState.evaluations[t.id] || {};
        const entries = Object.entries(teamEvals);
        let jury1Name = '-', score1 = '-', jury2Name = '-', score2 = '-';
        if (entries.length > 0) {
          jury1Name = appState.juries?.find(j => j.id === entries[0][0])?.name || 'Unknown';
          score1 = entries[0][1].total;
        }
        if (entries.length > 1) {
          jury2Name = appState.juries?.find(j => j.id === entries[1][0])?.name || 'Unknown';
          score2 = entries[1][1].total;
        }
        const avg = entries.length >= 2 ? ((score1 + score2) / 2).toFixed(2) : '-';
        return {
          TeamCode: t.teamCode,
          TeamName: t.teamName,
          Hall: t.hallId,
          Day: t.assignedDay,
          Jury1: jury1Name,
          Score1: score1,
          Jury2: jury2Name,
          Score2: score2,
          Average: avg,
          Status: entries.length >= 2 ? 'Complete' : 'Pending'
        };
      }) || [];
    downloadCSV('consolidated_results.csv', data);
  };

  return (
    <div>
      <h2>Exports</h2>
      <p>Export results in various formats</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
        <div className="card text-center">
          <h3>📊 Team-wise</h3>
          <p>Export results grouped by team</p>
          <button className="btn btn-primary w-full" onClick={exportTeamWise}>
            Download CSV
          </button>
        </div>

        <div className="card text-center">
          <h3>🏛️ Hall-wise</h3>
          <p>Export results grouped by hall</p>
          <button className="btn btn-primary w-full" onClick={exportHallWise}>
            Download CSV
          </button>
        </div>

        <div className="card text-center">
          <h3>📋 Consolidated</h3>
          <p>Complete results with all details</p>
          <button className="btn btn-primary w-full" onClick={exportConsolidated}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportsPage;
