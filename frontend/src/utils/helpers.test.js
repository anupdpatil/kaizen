import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveContestId, getContestScopedItems, calculateWeightedTotal } from './helpers.js';

test('prefers the active contest stored in app state when multiple contests exist', () => {
  const appState = {
    contests: [
      { id: 'contest-1', published: false },
      { id: 'contest-2', published: true }
    ],
    state: {
      activeContestId: 'contest-1'
    }
  };

  assert.equal(getActiveContestId(appState), 'contest-1');
});

test('scopes teams and assignments to the selected contest', () => {
  const teams = [
    { id: 'team-1', contestId: 'contest-1' },
    { id: 'team-2', contestId: 'contest-2' }
  ];

  const assignments = [
    { id: 'assignment-1', contestId: 'contest-1' },
    { id: 'assignment-2', contestId: 'contest-2' }
  ];

  assert.deepEqual(getContestScopedItems(teams, 'contest-1').map(t => t.id), ['team-1']);
  assert.deepEqual(getContestScopedItems(assignments, 'contest-1').map(a => a.id), ['assignment-1']);
});

test('calculates weighted total using the active category criteria', () => {
  const criteria = [
    { criterion: 'Theme Selection', weightage: 10 },
    { criterion: 'Problem Definition (Before Status)', weightage: 15 }
  ];

  const total = calculateWeightedTotal({
    'Theme Selection': 8,
    'Problem Definition (Before Status)': 10
  }, criteria);

  assert.equal(total, 23);
});
