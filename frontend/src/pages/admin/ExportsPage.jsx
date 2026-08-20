import { calculateTeamScore, getActiveContestId, getHallLabel } from '../../utils/helpers.js';
import { CATEGORY_WISE_EVALUATION_CRITERIA } from '../../constants/categoryWiseEvaluationCriteria.js';

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

  const activeContestId = getActiveContestId(appState);
  const exportTeamWise = () => {
    const data = appState.teams
      ?.filter(t => !t.isDeleted)
      .filter(t => !activeContestId || t.contestId === activeContestId)
      .map(t => {
        const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[t.category] || CATEGORY_WISE_EVALUATION_CRITERIA['Allied Case Study'];
        const score = calculateTeamScore(appState.evaluations, t.id, criteria);
        return {
          TeamCode: t.teamCode,
          TeamName: t.teamName,
          OrganisationName: t.organisationName || t.teamName,
          Category: t.category || 'Other',
          Hall: getHallLabel(appState, t.contestId, t.hallId),
          Day: t.assignedDay,
          WeightedScore: score ? Number(score).toFixed(2) : '-'
        };
      }) || [];
    downloadCSV('team_wise_results.csv', data);
  };

  const exportHallWise = () => {
    const data = [];
    const contests = activeContestId
      ? (appState.contests || []).filter(contest => contest.id === activeContestId)
      : (appState.contests || []);

    for (const contest of contests) {
      for (let hall = 1; hall <= contest.hallCount; hall++) {
        const hallTeams = appState.teams?.filter(t => t.contestId === contest.id && t.hallId === hall && !t.isDeleted) || [];
        const scores = hallTeams
          .map(t => {
            const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[t.category] || CATEGORY_WISE_EVALUATION_CRITERIA['Allied Case Study'];
            return calculateTeamScore(appState.evaluations, t.id, criteria);
          })
          .filter(s => s !== null);
        const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(2) : '-';
        data.push({
          Contest: contest.name,
          Hall: getHallLabel(appState, contest.id, hall),
          TeamsCount: hallTeams.length,
          CompletedCount: scores.length,
          AverageWeightedScore: avgScore
        });
      }
    }
    downloadCSV('hall_wise_results.csv', data);
  };

  const exportConsolidated = () => {
    const data = appState.teams
      ?.filter(t => !t.isDeleted)
      .filter(t => !activeContestId || t.contestId === activeContestId)
      .map(t => {
        const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[t.category] || CATEGORY_WISE_EVALUATION_CRITERIA['Allied Case Study'];
        const teamEvals = appState.evaluations[t.id] || {};
        const entries = Object.entries(teamEvals);
        let jury1Name = '-', score1 = '-', jury2Name = '-', score2 = '-';
        const getWeightedScore = (evaluation) => {
          if (!evaluation) return 0;
          const fallbackScore = evaluation.total ?? calculateTeamScore({ [t.id]: evaluation }, t.id, criteria) ?? 0;
          return Number(fallbackScore.toFixed(2));
        };

        if (entries.length > 0) {
          const jury1 = appState.juries?.find(j => j.id === entries[0][0]);
          jury1Name = jury1?.name || 'Unknown';
          score1 = getWeightedScore(entries[0][1]);
        }
        if (entries.length > 1) {
          const jury2 = appState.juries?.find(j => j.id === entries[1][0]);
          jury2Name = jury2?.name || 'Unknown';
          score2 = getWeightedScore(entries[1][1]);
        }
        const avg = entries.length >= 2 ? ((Number(score1) + Number(score2)) / 2).toFixed(2) : '-';
        return {
          TeamCode: t.teamCode,
          TeamName: t.teamName,
          OrganisationName: t.organisationName || t.teamName,
          Category: t.category || 'Other',
          Hall: getHallLabel(appState, t.contestId, t.hallId),
          Day: t.assignedDay,
          Jury1: jury1Name,
          WeightedScore1: score1,
          Jury2: jury2Name,
          WeightedScore2: score2,
          AverageWeightedScore: avg,
          Status: entries.length >= 2 ? 'Complete' : 'Pending'
        };
      }) || [];
    downloadCSV('consolidated_results.csv', data);
  };

  const exportDetailedJuryScores = () => {
    const data = [];

    appState.teams
      ?.filter(t => !t.isDeleted)
      .filter(t => !activeContestId || t.contestId === activeContestId)
      .forEach(t => {
        const teamCategory = t.category || 'Allied Case Study';
        const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[teamCategory] || CATEGORY_WISE_EVALUATION_CRITERIA['Allied Case Study'];
        const sortedCriteria = criteria.map(c => c.criterion);
        
        const teamEvals = appState.evaluations[t.id] || {};
        const entries = Object.entries(teamEvals);

        entries.forEach(([juryId, evaluation]) => {
          const jury = appState.juries?.find(j => j.id === juryId);
          const row = {
            TeamCode: t.teamCode,
            TeamName: t.teamName,
            OrganisationName: t.organisationName || t.teamName,
            Category: t.category || 'Other',
            Hall: getHallLabel(appState, t.contestId, t.hallId),
            Day: t.assignedDay,
            JuryName: jury?.name || 'Unknown'
          };

          // Add individual criterion scores based on team category
          sortedCriteria.forEach(criterion => {
            row[criterion] = evaluation.scores?.[criterion] ?? '-';
          });

          row['Total'] = evaluation.total ?? '-';
          row['SubmittedAt'] = evaluation.submittedAt ?? '-';
          data.push(row);
        });
      });

    downloadCSV('detailed_jury_scores.csv', data);
  };

  return (
    <div>
      <h2>Exports</h2>
      <p style={{ marginBottom: '1rem' }}>Export results in various formats</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
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

        <div className="card text-center">
          <h3>👥 Detailed Jury Scores</h3>
          <p>All criterion scores per jury member</p>
          <button className="btn btn-primary w-full" onClick={exportDetailedJuryScores}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportsPage;
