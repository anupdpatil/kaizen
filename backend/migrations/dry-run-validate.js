const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

export function validateDryRun(result) {
  const { target, source, mappings, warnings, errors } = result;
  const validationErrors = [...errors];
  const contestId = target.contests[0]?.id;
  const counts = {
    teams: { source: source.teams.length, target: target.teams.length },
    assignments: { source: source.assignments.length, target: target.assignments.length },
    evaluations: { source: source.evaluationEntries.length, target: target.evaluations.length },
    relevantJuries: { source: source.referencedJuryIds.length, target: target.juryProfiles.length }
  };
  for (const [entity, count] of Object.entries(counts)) {
    count.difference = count.target - count.source;
    if (count.difference !== 0) validationErrors.push({ code: 'COUNT_MISMATCH', entity, ...count });
  }
  const collections = ['teams', 'juryProfiles', 'contestJuryParticipations', 'assignments', 'evaluations', 'auditLogs'];
  for (const collection of collections) {
    const duplicates = duplicateValues(target[collection].map((record) => record.id));
    if (duplicates.length) validationErrors.push({ code: 'DUPLICATE_TARGET_ID', collection, ids: duplicates });
  }
  const duplicateTeamCodes = duplicateValues(target.teams.map((team) => team.teamCode).filter(Boolean));
  if (duplicateTeamCodes.length) validationErrors.push({ code: 'DUPLICATE_TEAM_CODE', codes: duplicateTeamCodes });
  const duplicateAssignmentSlots = duplicateValues(target.assignments.map((assignment) => `${assignment.contestId}:${assignment.schedule.day}:${assignment.schedule.hallId}`));
  if (duplicateAssignmentSlots.length) validationErrors.push({ code: 'DUPLICATE_ASSIGNMENT_SLOT', keys: duplicateAssignmentSlots });
  const duplicateEvaluations = duplicateValues(target.evaluations.map((evaluation) => `${evaluation.contestId}:${evaluation.teamId}:${evaluation.contestJuryParticipationId}`));
  if (duplicateEvaluations.length) validationErrors.push({ code: 'DUPLICATE_EVALUATION_KEY', keys: duplicateEvaluations });
  const teamIds = new Set(target.teams.map((team) => team.id));
  const participationIds = new Set(target.contestJuryParticipations.map((participation) => participation.id));
  for (const record of [...target.teams, ...target.assignments, ...target.evaluations]) {
    if (record.contestId !== contestId) validationErrors.push({ code: 'CROSS_CONTEST_REFERENCE', recordId: record.id, contestId: record.contestId });
  }
  for (const assignment of target.assignments) for (const juryParticipationId of assignment.juryParticipationIds) if (!participationIds.has(juryParticipationId)) validationErrors.push({ code: 'ASSIGNMENT_PARTICIPATION_MISSING', assignmentId: assignment.id, juryParticipationId });
  for (const evaluation of target.evaluations) {
    if (!teamIds.has(evaluation.teamId)) validationErrors.push({ code: 'EVALUATION_TEAM_REFERENCE_MISSING', evaluationId: evaluation.id, teamId: evaluation.teamId });
    if (!participationIds.has(evaluation.contestJuryParticipationId)) validationErrors.push({ code: 'EVALUATION_JURY_REFERENCE_MISSING', evaluationId: evaluation.id, juryParticipationId: evaluation.contestJuryParticipationId });
  }
  const status = validationErrors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS';
  return { status, counts, validationErrors, warnings, mappings, targetSummary: Object.fromEntries(Object.entries(target).map(([name, records]) => [name, records.length])) };
}
