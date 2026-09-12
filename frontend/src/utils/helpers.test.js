import { describe, expect, it } from 'vitest';
import {
  calculateCategoryScore,
  calculateTeamScore,
  calculateWeightedTotal,
  formatActivitySummary,
  generateXLSXContent,
  getActiveContestId,
  getActivityStats,
  getCompletionPercentage,
  getContestScopedItems,
  getHallCompletion,
  getHallLabel,
  getTeamRanking
} from './helpers.js';
import { CATEGORY_WISE_EVALUATION_CRITERIA } from '../constants/categoryWiseEvaluationCriteria.js';
import { TEAM_CATEGORIES } from '../constants/teamCategories.js';

describe('contest helpers', () => {
it('prefers the active contest stored in app state when multiple contests exist', () => {
  const appState = {
    contests: [
      { id: 'contest-1', published: false },
      { id: 'contest-2', published: true }
    ],
    state: {
      activeContestId: 'contest-1'
    }
  };

  expect(getActiveContestId(appState)).toBe('contest-1');
});

it('falls back to published, then first contest, then null', () => {
  expect(getActiveContestId({ contests: [{ id: 'published', published: true }] })).toBe('published');
  expect(getActiveContestId({ contests: [{ id: 'first' }, { id: 'second' }] })).toBe('first');
  expect(getActiveContestId()).toBeNull();
});

it('scopes teams and assignments to the selected contest', () => {
  const teams = [
    { id: 'team-1', contestId: 'contest-1' },
    { id: 'team-2', contestId: 'contest-2' }
  ];

  const assignments = [
    { id: 'assignment-1', contestId: 'contest-1' },
    { id: 'assignment-2', contestId: 'contest-2' }
  ];

  expect(getContestScopedItems(teams, 'contest-1').map(t => t.id)).toEqual(['team-1']);
  expect(getContestScopedItems(assignments, 'contest-1').map(a => a.id)).toEqual(['assignment-1']);
  expect(getContestScopedItems(teams)).toBe(teams);
});

it('formats hall labels', () => {
  const state = { contests: [{ id: 'contest-1', hallNames: { 1: 'Main Hall' } }] };
  expect(getHallLabel(state, 'contest-1', 1)).toBe('Main Hall (Hall 1)');
  expect(getHallLabel(state, 'contest-1', 2)).toBe('Hall 2');
});

it('calculates weighted total using the active category criteria', () => {
  const criteria = [
    { criterion: 'Theme Selection', weightage: 10 },
    { criterion: 'Problem Definition (Before Status)', weightage: 15 }
  ];

  const total = calculateWeightedTotal({
    'Theme Selection': 8,
    'Problem Definition (Before Status)': 10
  }, criteria);

  expect(total).toBe(18);
});

it('calculates team and category scores only after two evaluations', () => {
  const evaluations = {
    team: {
      jury1: { total: 80, scores: { a: 8 } },
      jury2: { total: 90, scores: { a: 9 } }
    }
  };
  expect(calculateTeamScore({}, 'missing')).toBeNull();
  expect(calculateTeamScore({ team: { jury1: { total: 80 } } }, 'team')).toBeNull();
  expect(calculateTeamScore(evaluations, 'team')).toBe(85);
  expect(calculateTeamScore(evaluations, 'team', [{ criterion: 'a' }])).toBe(17 / 2);
  expect(calculateCategoryScore({}, 'missing', [])).toBeNull();
  expect(calculateCategoryScore(evaluations, 'team', [])).toBe(8.5);
  expect(calculateCategoryScore({ team: { jury1: { scores: { a: 8 } } } }, 'team', [])).toBeNull();
});

it('ranks active teams and calculates completion', () => {
  const state = {
    teams: [
      { id: 'one', contestId: 'c', teamName: 'One' },
      { id: 'two', contestId: 'c', teamName: 'Two' },
      { id: 'deleted', contestId: 'c', isDeleted: true }
    ],
    evaluations: {
      one: { a: {}, b: {} },
      two: { a: {} }
    }
  };
  expect(getTeamRanking(state, (_, id) => id === 'one' ? 90 : null).map(item => item.team.id)).toEqual(['one']);
  expect(getCompletionPercentage(state, 'c')).toBe(50);
  expect(getCompletionPercentage({ teams: [], evaluations: {} }, 'c')).toBe(0);
});

it('calculates hall completion with contest scoping', () => {
  const state = {
    contests: [{ id: 'c', published: true }],
    teams: [
      { id: 'one', contestId: 'c', hallId: 1, assignedDay: 1 },
      { id: 'two', contestId: 'c', hallId: 1, assignedDay: 1 },
      { id: 'other', contestId: 'x', hallId: 1, assignedDay: 1 },
      { id: 'deleted', contestId: 'c', hallId: 1, assignedDay: 1, isDeleted: true }
    ],
    evaluations: { one: { a: {}, b: {} }, two: { a: {} } }
  };
  expect(getHallCompletion(state, 1, 1, 'c')).toEqual({ completed: 1, total: 2, percentage: 50 });
  expect(getHallCompletion(state, 4, 1, 'c')).toEqual({ completed: 0, total: 0, percentage: 0 });
});
});

describe('activity helpers', () => {
it('formats activity messages for every supported action', () => {
  expect(formatActivitySummary()).toBe('Activity recorded');
  expect(formatActivitySummary({ action: 'paper_score_backfill' })).toContain('reconciliation');
  expect(formatActivitySummary({ action: 'login', actor: 'A' })).toContain('signed in');
  expect(formatActivitySummary({ action: 'login_failed', details: { username: 'u' } })).toContain('u');
  expect(formatActivitySummary({ action: 'create', entityType: 'contest', details: { name: 'C', code: 'X' } })).toContain('C');
  expect(formatActivitySummary({ action: 'create', entityType: 'team', details: { teamName: 'T' } })).toContain('T');
  expect(formatActivitySummary({ action: 'create', entityType: 'jury', details: { name: 'J' } })).toContain('J');
  expect(formatActivitySummary({ action: 'create', entityType: 'team', details: {} })).toContain('record');
  expect(formatActivitySummary({ action: 'create', entityType: 'jury', details: {} })).toContain('record');
  expect(formatActivitySummary({ action: 'create', entityType: 'other' })).toContain('created a other');
  expect(formatActivitySummary({ action: 'update', entityType: 'contest', details: { name: 'C' } })).toContain('Updated contest');
  expect(formatActivitySummary({ action: 'update', entityType: 'team', details: { teamName: 'T' } })).toContain('Updated team');
  expect(formatActivitySummary({ action: 'update', entityType: 'jury', details: { username: 'J' } })).toContain('Updated jury');
  expect(formatActivitySummary({ action: 'update', entityType: 'other' })).toContain('updated other');
  expect(formatActivitySummary({ action: 'delete', actor: 'A', entityType: 'team' })).toContain('deleted');
  expect(formatActivitySummary({ action: 'archive', details: { name: 'C' } })).toContain('archived');
  expect(formatActivitySummary({ action: 'assign', details: { hallId: 1, day: 2 } })).toContain('Assigned');
  expect(formatActivitySummary({ action: 'update_assignment', details: { hallId: 1, day: 2 } })).toContain('Updated');
  expect(formatActivitySummary({ action: 'delete_assignment', details: { hallId: 1, day: 2 } })).toContain('Removed');
  expect(formatActivitySummary({ action: 'autosave' })).toContain('Auto-saved');
  expect(formatActivitySummary({ action: 'unknown', actor: 'A', entityType: 'x' })).toContain('performed');
});

it('summarizes activity counts', () => {
  expect(getActivityStats([
    { action: 'login' }, { action: 'create' }, { action: 'update' },
    { action: 'update_assignment' }, { action: 'delete' }, { action: 'delete_assignment' },
    { action: 'assign' }, { action: 'autosave' }, { action: 'other' }
  ])).toEqual({ total: 9, login: 1, create: 1, update: 2, delete: 2, assignment: 3, autosave: 1 });
  expect(getActivityStats()).toEqual({ total: 0, login: 0, create: 0, update: 0, delete: 0, assignment: 0, autosave: 0 });
});
});

describe('export helpers', () => {
it('generates worksheet XML descriptors', () => {
  expect(generateXLSXContent({ Sheet: [['A&B', '<x>']] })[0].xml).toContain('A&amp;B');
  expect(generateXLSXContent({ Sheet: { rows: [['value']] } })[0].name).toBe('Sheet');
});

it('exports the application category mappings', () => {
  expect(CATEGORY_WISE_EVALUATION_CRITERIA['Quality Circle'].length).toBeGreaterThan(0);
  expect(TEAM_CATEGORIES.Kaizen).toBe('Allied Case Study');
});
});
