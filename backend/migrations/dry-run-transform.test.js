import test from 'node:test';
import assert from 'node:assert/strict';
import { transformSnapshot } from './dry-run-transform.js';
import { validateDryRun } from './dry-run-validate.js';

const snapshot = {
  contests: [{ id: 'c1', code: 'C1', name: 'Contest', startDate: '2026-01-01', days: 1, hallCount: 1, hallNames: { 1: 'Main' }, status: 'active', published: true, allowScoreUpdates: false, createdAt: '2026-01-01T00:00:00.000Z' }],
  teams: [
    { id: 't1', contestId: 'c1', teamCode: 'A', teamName: 'Alpha', organisationName: 'Org', category: 'Kaizen', assignedDay: 1, hallId: 1, isDeleted: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 't2', contestId: 'c1', teamCode: 'B', teamName: 'Beta', organisationName: 'Org', category: 'Unknown', assignedDay: 1, hallId: 1, isDeleted: false, createdAt: '2026-01-01T00:00:00.000Z' }
  ],
  juries: [{ id: 'j1', name: 'Jury One', username: 'jury1', role: 'jury', isDeleted: false, createdAt: '2026-01-01T00:00:00.000Z' }],
  assignments: [{ id: 'a1', contestId: 'c1', day: 1, hallId: 1, juryIds: ['j1'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
  evaluations: { t1: { j1: { scores: { Theme: 7, Results: 8 }, total: 15, submittedAt: '2026-01-02T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', submittedBy: 'j1' } }, t2: { j1: { scores: { Theme: 4 }, total: 4, submittedAt: '2026-01-02T00:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z', submittedBy: 'j1' } } },
  state: { activeContestId: 'c1' },
  activityLogs: [{ id: 'log1', actor: 'admin', actorRole: 'admin', action: 'create', entityType: 'contest', entityId: 'c1', details: {}, createdAt: '2026-01-01T00:00:00.000Z' }]
};

test('dry-run transform preserves evaluation scores, totals, IDs, and contest scope', () => {
  const transformed = transformSnapshot(snapshot, 'c1', '2026-02-01T00:00:00.000Z');
  const evaluation = transformed.target.evaluations.find((item) => item.teamId === 't1');
  assert.equal(evaluation.contestId, 'c1');
  assert.equal(evaluation.total.preserved, 15);
  assert.deepEqual(evaluation.scoreEntries, [{ sourceCriterionLabel: 'Theme', score: 7 }, { sourceCriterionLabel: 'Results', score: 8 }]);
  assert.equal(transformed.target.teams.length, 2);
  assert.equal(transformed.target.contestJuryParticipations.length, 1);
});

test('validator reports unresolved category as warning but valid source as pass with warnings', () => {
  const transformed = transformSnapshot(snapshot, 'c1');
  const report = validateDryRun(transformed);
  assert.equal(report.status, 'PASS_WITH_WARNINGS');
  assert.ok(report.warnings.some((warning) => warning.code === 'TEAM_CATEGORY_UNRESOLVED'));
});

test('validator fails instead of changing a stored total that differs from raw scores', () => {
  const invalid = structuredClone(snapshot);
  invalid.evaluations.t1.j1.total = 99;
  const report = validateDryRun(transformSnapshot(invalid, 'c1'));
  assert.equal(report.status, 'FAIL');
  assert.ok(report.validationErrors.some((error) => error.code === 'SCORE_TOTAL_MISMATCH'));
});
