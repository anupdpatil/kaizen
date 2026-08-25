import { TEAM_CATEGORIES } from '../../frontend/src/constants/teamCategories.js';
import { CATEGORY_WISE_EVALUATION_CRITERIA } from '../../frontend/src/constants/categoryWiseEvaluationCriteria.js';

const copy = (value) => structuredClone(value);
const rawScoreTotal = (scores) => Object.values(scores || {}).reduce((sum, value) => sum + Number(value), 0);

const addMapping = (mappings, sourceType, sourceId, targetType, targetId, status = 'PRESERVED', reason = null) => {
  mappings.push({ sourceType, sourceId, targetType, targetId, status, ...(reason && { reason }) });
};

const getSourceEvaluationEntries = (evaluations, teamIds) => teamIds.flatMap((teamId) =>
  Object.entries(evaluations?.[teamId] || {}).map(([juryId, evaluation]) => ({ teamId, juryId, evaluation }))
);

export function transformSnapshot(snapshot, contestId, generatedAt = new Date().toISOString()) {
  const warnings = [];
  const errors = [];
  const mappings = [];
  const contests = snapshot.contests || [];
  const contest = contests.filter((item) => item?.id === contestId);

  if (contest.length !== 1) {
    throw new Error(contest.length ? `Contest ID ${contestId} is duplicated in the source.` : `Contest ID ${contestId} was not found.`);
  }

  const sourceContest = contest[0];
  const sourceTeams = (snapshot.teams || []).filter((team) => team?.contestId === contestId);
  const sourceAssignments = (snapshot.assignments || []).filter((assignment) => assignment?.contestId === contestId);
  const teamById = new Map(sourceTeams.map((team) => [team.id, team]));
  const evaluationEntries = getSourceEvaluationEntries(snapshot.evaluations, sourceTeams.map((team) => team.id));
  const referencedJuryIds = new Set([
    ...sourceAssignments.flatMap((assignment) => Array.isArray(assignment.juryIds) ? assignment.juryIds : []),
    ...evaluationEntries.map((entry) => entry.juryId)
  ]);
  const juryById = new Map((snapshot.juries || []).map((jury) => [jury.id, jury]));

  const target = {
    contests: [], configurationVersions: [], teams: [], juryProfiles: [], contestJuryParticipations: [],
    assignments: [], evaluations: [], auditLogs: []
  };

  const configurationVersionId = `legacy-config:${contestId}`;
  const targetContest = {
    id: sourceContest.id,
    code: sourceContest.code,
    name: sourceContest.name,
    schedule: {
      startDate: sourceContest.startDate,
      days: sourceContest.days,
      hallCount: sourceContest.hallCount,
      hallNames: copy(sourceContest.hallNames || {})
    },
    legacy: {
      status: sourceContest.status,
      published: sourceContest.published,
      deletedAt: sourceContest.deletedAt,
      deletedHalls: copy(sourceContest.deletedHalls || []),
      allowScoreUpdates: sourceContest.allowScoreUpdates,
      createdAt: sourceContest.createdAt
    },
    effectiveConfigurationVersionId: configurationVersionId
  };
  target.contests.push(targetContest);
  addMapping(mappings, 'contest', sourceContest.id, 'contest', targetContest.id);

  target.configurationVersions.push({
    id: configurationVersionId,
    contestId,
    status: 'PROVISIONAL',
    historicalConfidence: 'REQUIRES_VALIDATION',
    source: 'current_frontend_constants',
    generatedAt,
    categoryGroups: copy(TEAM_CATEGORIES),
    criteriaByGroup: copy(CATEGORY_WISE_EVALUATION_CRITERIA),
    scoring: { runtimeAlgorithm: 'raw_sum_of_scores', historicalFormula: 'UNRESOLVED' }
  });
  warnings.push({ code: 'HISTORICAL_RUBRIC_UNRESOLVED', message: 'Current frontend categories and criteria are provisional and not proven historical rubric data.' });

  for (const team of sourceTeams) {
    if (!team?.id) {
      errors.push({ code: 'TEAM_ID_MISSING', message: 'A selected-contest team has no ID.' });
      continue;
    }
    const mappedCategory = TEAM_CATEGORIES[team.category];
    if (!mappedCategory) {
      warnings.push({ code: 'TEAM_CATEGORY_UNRESOLVED', sourceId: team.id, message: `Team category "${team.category}" has no current frontend group mapping.` });
    }
    const targetTeam = {
      id: team.id, contestId, teamCode: team.teamCode, name: team.teamName,
      organisation: { nameSnapshot: team.organisationName },
      category: { legacyLabel: team.category, ...(mappedCategory && { currentApplicationGroup: mappedCategory }) },
      schedule: { day: team.assignedDay, hallId: team.hallId },
      legacy: { isDeleted: team.isDeleted, createdAt: team.createdAt }
    };
    target.teams.push(targetTeam);
    addMapping(mappings, 'team', team.id, 'team', targetTeam.id);
  }

  const participationIdFor = (juryId) => `legacy-cjp:${contestId}:${juryId}`;
  for (const juryId of referencedJuryIds) {
    const jury = juryById.get(juryId);
    if (!jury) {
      errors.push({ code: 'JURY_REFERENCE_MISSING', sourceId: juryId, message: 'Assignment or evaluation references a jury absent from the source juries wrapper.' });
      continue;
    }
    const profile = { id: jury.id, displayName: jury.name, legacy: { username: jury.username, role: jury.role, isDeleted: jury.isDeleted, createdAt: jury.createdAt } };
    target.juryProfiles.push(profile);
    addMapping(mappings, 'jury', jury.id, 'juryProfile', profile.id);
    const participation = { id: participationIdFor(jury.id), contestId, juryProfileId: jury.id, displayNameSnapshot: jury.name, legacy: { sourceJuryId: jury.id, isDeleted: jury.isDeleted } };
    target.contestJuryParticipations.push(participation);
    addMapping(mappings, 'jury', jury.id, 'contestJuryParticipation', participation.id, 'DERIVED', 'Referenced by assignment or evaluation.');
  }

  for (const assignment of sourceAssignments) {
    const juryIds = Array.isArray(assignment.juryIds) ? assignment.juryIds : [];
    const juryParticipationIds = juryIds.map(participationIdFor);
    if (!assignment?.id) errors.push({ code: 'ASSIGNMENT_ID_MISSING', message: 'A selected-contest assignment has no ID.' });
    target.assignments.push({ id: assignment.id, contestId, schedule: { day: assignment.day, hallId: assignment.hallId, hallNameSnapshot: sourceContest.hallNames?.[assignment.hallId] }, juryParticipationIds, legacy: { sourceJuryIds: copy(juryIds), createdAt: assignment.createdAt, updatedAt: assignment.updatedAt, historyAvailable: false } });
    addMapping(mappings, 'hall_assignment', assignment.id, 'assignment', assignment.id);
  }

  for (const { teamId, juryId, evaluation } of evaluationEntries) {
    const team = teamById.get(teamId);
    if (!team) {
      errors.push({ code: 'EVALUATION_TEAM_MISSING', sourceId: `${teamId}:${juryId}`, message: 'Evaluation team is not in the selected contest.' });
      continue;
    }
    const jury = juryById.get(juryId);
    if (!jury) {
      errors.push({ code: 'EVALUATION_JURY_MISSING', sourceId: `${teamId}:${juryId}`, message: 'Evaluation jury is absent from source juries.' });
      continue;
    }
    const candidates = sourceAssignments.filter((assignment) => assignment.day === team.assignedDay && assignment.hallId === team.hallId && Array.isArray(assignment.juryIds) && assignment.juryIds.includes(juryId));
    const assignmentId = candidates.length === 1 ? candidates[0].id : null;
    if (candidates.length !== 1) warnings.push({ code: 'EVALUATION_ASSIGNMENT_UNRESOLVED', sourceId: `${teamId}:${juryId}`, message: `Expected one matching assignment; found ${candidates.length}.` });
    const scoreEntries = Object.entries(evaluation?.scores || {}).map(([sourceCriterionLabel, score]) => ({ sourceCriterionLabel, score }));
    const rawTotal = rawScoreTotal(evaluation?.scores || {});
    if (Number(evaluation?.total) !== rawTotal) errors.push({ code: 'SCORE_TOTAL_MISMATCH', sourceId: `${teamId}:${juryId}`, storedTotal: evaluation?.total, rawScoreTotal: rawTotal });
    if (evaluation?.submittedBy !== juryId) errors.push({ code: 'EVALUATION_SUBMITTER_MISMATCH', sourceId: `${teamId}:${juryId}`, submittedBy: evaluation?.submittedBy, juryId });
    const targetId = `legacy-evaluation:${teamId}:${juryId}`;
    target.evaluations.push({
      id: targetId, contestId, teamId, contestJuryParticipationId: participationIdFor(juryId), assignmentId,
      category: { legacyLabel: team.category }, configurationVersionId,
      scoreEntries, total: { preserved: evaluation?.total },
      timestamps: { createdAt: evaluation?.createdAt, submittedAt: evaluation?.submittedAt },
      evaluator: { sourceJuryId: juryId, displayNameSnapshot: jury.name, submittedBy: evaluation?.submittedBy },
      legacy: { runtimeAlgorithm: 'raw_sum_of_scores', rubricMapping: 'UNRESOLVED' }
    });
    addMapping(mappings, 'evaluation', `${teamId}:${juryId}`, 'evaluation', targetId, 'DERIVED', 'Source identity is nested teamId:juryId.');
  }

  const contestEntityIds = new Set([contestId, ...sourceTeams.map((team) => team.id), ...sourceAssignments.map((assignment) => assignment.id)]);
  for (const log of snapshot.activityLogs || []) {
    const explicitContest = log?.details?.contestId === contestId || (log?.entityType === 'contest' && log?.entityId === contestId);
    const mappedEntity = contestEntityIds.has(log?.entityId);
    if (!explicitContest && !mappedEntity) {
      warnings.push({ code: 'ACTIVITY_UNRESOLVED', sourceId: log?.id, message: 'Activity event cannot be deterministically scoped to the selected contest.' });
      continue;
    }
    target.auditLogs.push({ id: log.id, contestId, actor: log.actor, actorRole: log.actorRole, action: log.action, entityType: log.entityType, entityId: log.entityId, metadata: copy(log.details || {}), createdAt: log.createdAt });
    addMapping(mappings, 'activity_log', log.id, 'auditLog', log.id);
  }

  return { target, mappings, warnings, errors, source: { contest: sourceContest, teams: sourceTeams, assignments: sourceAssignments, evaluationEntries, referencedJuryIds: [...referencedJuryIds] } };
}
