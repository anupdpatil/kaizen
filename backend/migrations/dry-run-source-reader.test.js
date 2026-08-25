import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSelectedContest, readArraySource, readObjectSource } from './dry-run-source-reader.js';

const fakeCollection = (document) => ({
  calls: [],
  async findOne(query) {
    this.calls.push(query);
    return document;
  }
});

test('array reader accepts an application-style wrapper with _id=data', async () => {
  const collection = fakeCollection({ _id: 'data', data: [{ id: 'contest-1' }] });
  assert.deepEqual(await readArraySource(collection), [{ id: 'contest-1' }]);
  assert.deepEqual(collection.calls, [{}]);
});

test('array reader accepts a wrapper with a different MongoDB _id', async () => {
  const collection = fakeCollection({ _id: 'another-id', data: [{ id: 'contest-1' }] });
  assert.deepEqual(await readArraySource(collection), [{ id: 'contest-1' }]);
  assert.deepEqual(collection.calls, [{}]);
});

test('array reader treats a missing wrapper document as an empty array', async () => {
  assert.deepEqual(await readArraySource(fakeCollection(null)), []);
});

test('object reader treats a missing singleton document as an empty object', async () => {
  assert.deepEqual(await readObjectSource(fakeCollection(null)), {});
});

test('contest selection reports an empty source and a missing selected contest clearly', () => {
  assert.throws(() => assertSelectedContest({ contests: [] }, 'contest-1'), /No contests exist in the source database/);
  assert.throws(() => assertSelectedContest({ contests: [{ id: 'contest-2' }] }, 'contest-1'), /Selected contest contest-1 was not found in the source database/);
});
