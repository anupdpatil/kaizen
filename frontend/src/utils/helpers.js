export const getActiveContestId = (appState = {}) => {
  const contests = appState.contests || [];
  const activeContestId = appState.state?.activeContestId;

  if (activeContestId && contests.some(contest => contest.id === activeContestId)) {
    return activeContestId;
  }

  const publishedContest = contests.find(contest => contest.published && !contest.deletedAt);
  if (publishedContest) {
    return publishedContest.id;
  }

  return contests[0]?.id || null;
};

export const getContestScopedItems = (items = [], contestId) => {
  if (!contestId) return items;
  return items.filter(item => item.contestId === contestId);
};

export const getHallLabel = (appState = {}, contestId, hallId) => {
  const contest = (appState.contests || []).find(item => item.id === contestId);
  const hallName = contest?.hallNames?.[hallId];

  return hallName ? `${hallName} (Hall ${hallId})` : `Hall ${hallId}`;
};

export const calculateWeightedTotal = (scores = {}, criteria = []) => {
  // if (!criteria.length) {
  //   return Object.values(scores).reduce((sum, value) => sum + Number(value || 0), 0);
  // }

  // return criteria.reduce((sum, criterion) => {
  //   const scoreValue = Number(scores[criterion.criterion] ?? 0);
  //   const weightage = Number(criterion.weightage ?? 0);
  //   return sum + (scoreValue * weightage) / 10;
  // }, 0);
  return Object.values(scores).reduce((sum, value) => sum + value, 0);
};

// Scoring calculations
export const calculateTeamScore = (evaluations, teamId, criteria = []) => {
  const teamEvals = evaluations[teamId];
  if (!teamEvals || Object.keys(teamEvals).length < 2) return null;

  const totals = Object.values(teamEvals).map(e => {
    if (criteria.length > 0) {
      return calculateWeightedTotal(e.scores || {}, criteria);
    }
    return Number(e.total || 0);
  });

  return totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : null;
};

export const calculateCategoryScore = (evaluations, teamId, criteria) => {
  const teamEvals = evaluations[teamId];
  if (!teamEvals) return null;

  let totalScore = 0;
  let count = 0;

  for (const teamEvaluation of Object.values(teamEvals)) {
    const categoryTotal = calculateWeightedTotal(teamEvaluation.scores || {}, criteria);
    totalScore += categoryTotal;
    count++;
  }

  return count >= 2 ? totalScore / count : null;
};

export const getTeamRanking = (appState, scoreFn) => {
  const { teams, evaluations } = appState;
  const rankings = [];

  for (const team of teams) {
    if (team.isDeleted) continue;
    const score = scoreFn(evaluations, team.id);
    if (score !== null) {
      rankings.push({ team, score });
    }
  }

  return rankings.sort((a, b) => b.score - a.score);
};

export const getCompletionPercentage = (appState, contestId = getActiveContestId(appState)) => {
  const { teams, evaluations } = appState;
  const scopedTeams = contestId
    ? teams.filter(t => !t.isDeleted && t.contestId === contestId)
    : teams.filter(t => !t.isDeleted);

  const activeTeams = scopedTeams.length;
  if (activeTeams === 0) return 0;

  let completed = 0;
  for (const team of scopedTeams) {
    const teamEvals = evaluations[team.id];
    if (teamEvals && Object.keys(teamEvals).length >= 2) {
      completed++;
    }
  }

  return Math.round((completed / activeTeams) * 100);
};

export const getHallCompletion = (appState, hallId, day, contestId = getActiveContestId(appState)) => {
  const { teams, evaluations } = appState;
  const hallTeams = teams.filter(t => {
    const matchesContest = !contestId || t.contestId === contestId;
    return matchesContest && t.hallId === hallId && t.assignedDay === day && !t.isDeleted;
  });

  if (hallTeams.length === 0) return { completed: 0, total: 0, percentage: 0 };

  let completed = 0;
  for (const team of hallTeams) {
    const teamEvals = evaluations[team.id];
    if (teamEvals && Object.keys(teamEvals).length >= 2) {
      completed++;
    }
  }

  return {
    completed,
    total: hallTeams.length,
    percentage: Math.round((completed / hallTeams.length) * 100)
  };
};

export const formatActivitySummary = (activity) => {
  if (!activity) return 'Activity recorded';

  const details = activity.details || {};
  const actor = activity.actor || 'System';
  const entity = activity.entityType || 'record';
  const action = activity.action || 'updated';

  switch (action) {
    case 'login':
      return `${actor} signed in to the application.`;
    case 'login_failed':
      return `Failed login attempt for ${details.username || 'a user'}.`;
    case 'create':
      if (entity === 'contest') return `Created contest ${details.name || 'record'} (${details.code || 'N/A'}).`;
      if (entity === 'team') return `Created team ${details.teamName || details.teamCode || 'record'}.`;
      if (entity === 'jury') return `Added jury ${details.name || details.username || 'record'}.`;
      return `${actor} created a ${entity}.`;
    case 'update':
      if (entity === 'contest') return `Updated contest ${details.name || 'record'}.`;
      if (entity === 'team') return `Updated team ${details.teamName || details.teamCode || 'record'}.`;
      if (entity === 'jury') return `Updated jury ${details.username || 'record'}.`;
      return `${actor} updated ${entity}.`;
    case 'delete':
      return `${actor} deleted a ${entity}.`;
    case 'archive':
      return `${actor} archived contest ${details.name || 'record'}.`;
    case 'assign':
      return `Assigned juries for hall ${details.hallId || 'N/A'}, day ${details.day || 'N/A'}.`;
    case 'update_assignment':
      return `Updated jury assignment for hall ${details.hallId || 'N/A'}, day ${details.day || 'N/A'}.`;
    case 'delete_assignment':
      return `Removed assignment for hall ${details.hallId || 'N/A'}, day ${details.day || 'N/A'}.`;
    case 'autosave':
      return 'Auto-saved the current application state.';
    default:
      return `${actor} performed '${action}' on ${entity}.`;
  }
};

export const getActivityStats = (activityLogs = []) => {
  const summary = {
    total: activityLogs.length,
    login: 0,
    create: 0,
    update: 0,
    delete: 0,
    assignment: 0,
    autosave: 0
  };

  activityLogs.forEach((entry) => {
    const action = entry.action || '';
    if (action === 'login') summary.login += 1;
    if (action === 'create') summary.create += 1;
    if (action === 'update' || action === 'update_assignment') summary.update += 1;
    if (action === 'delete' || action === 'delete_assignment') summary.delete += 1;
    if (action === 'assign' || action === 'update_assignment' || action === 'delete_assignment') summary.assignment += 1;
    if (action === 'autosave') summary.autosave += 1;
  });

  return summary;
};

export const generateXLSXContent = (sheets) => {
  // Simple XLSX generation using XML and ZIP
  const xlsx = [];
  
  for (const [name, data] of Object.entries(sheets)) {
    const rows = Array.isArray(data) ? data : data.rows || [];
    let xmlContent = '<?xml version="1.0"?><worksheet><sheetData>';
    
    rows.forEach((row, rowIdx) => {
      xmlContent += `<row r="${rowIdx + 1}">`;
      if (Array.isArray(row)) {
        row.forEach((cell, colIdx) => {
          const cellRef = String.fromCharCode(65 + colIdx) + (rowIdx + 1);
          xmlContent += `<c r="${cellRef}" t="inlineStr"><is><t>${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></is></c>`;
        });
      }
      xmlContent += '</row>';
    });
    
    xmlContent += '</sheetData></worksheet>';
    xlsx.push({ name, xml: xmlContent });
  }
  
  return xlsx;
};
