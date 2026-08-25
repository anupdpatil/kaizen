// Read-only source helpers intentionally mirror db.getTable(): every source
// collection is read with findOne({}), never by a fixed MongoDB _id.
export async function readArraySource(collection) {
  const document = await collection.findOne({});
  return Array.isArray(document?.data) ? document.data : [];
}

export async function readObjectSource(collection) {
  const document = await collection.findOne({});
  return document ? document.data : {};
}

export async function readSourceSnapshot(database) {
  const [contests, juries, teams, assignments, evaluations, state, activityLogs] = await Promise.all([
    readArraySource(database.collection('contests')),
    readArraySource(database.collection('juries')),
    readArraySource(database.collection('teams')),
    readArraySource(database.collection('hall_assignments')),
    readObjectSource(database.collection('evaluations')),
    readObjectSource(database.collection('state')),
    database.collection('activity_logs').find({}).toArray()
  ]);

  if (!evaluations || typeof evaluations !== 'object' || !state || typeof state !== 'object') {
    throw new Error('One or more singleton source documents have an invalid V1 data shape.');
  }
  return { contests, juries, teams, assignments, evaluations, state, activityLogs };
}

export function assertSelectedContest(snapshot, contestId) {
  if (snapshot.contests.length === 0) {
    throw new Error('No contests exist in the source database.');
  }
  if (!snapshot.contests.some((contest) => contest?.id === contestId)) {
    throw new Error(`Selected contest ${contestId} was not found in the source database.`);
  }
}
