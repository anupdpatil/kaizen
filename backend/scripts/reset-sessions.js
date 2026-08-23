import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.argv[2] || 'production';
if (!['production', 'development'].includes(target)) {
  throw new Error('Usage: node scripts/reset-sessions.js [production|development]');
}

// Production remains the default. Development explicitly loads the isolated
// override, so its reset command can never clear production sessions.
dotenv.config({ path: path.join(__dirname, '../.env') });
if (target === 'development') {
  dotenv.config({
    path: path.join(__dirname, '../.env.development.local'),
    override: true
  });
}

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const databaseName = process.env.MONGODB_DB_NAME || 'kaizen';

if (!uri) {
  throw new Error('MONGODB_URI (or MONGO_URI) is required.');
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const database = client.db(databaseName);

  await database.collection('state').updateOne(
    {},
    {
      $set: {
        'data.adminSessionId': null,
        'data.adminSessionExpiresAt': null
      },
      $inc: { 'data.sessionVersion': 1 }
    },
    { upsert: true }
  );

  const juriesCollection = database.collection('juries');
  const juryDocument = await juriesCollection.findOne({ _id: 'data' });
  const juries = Array.isArray(juryDocument?.data) ? juryDocument.data : [];
  const resetJuries = juries.map((jury) => ({
    ...jury,
    sessionId: null,
    sessionExpiresAt: null
  }));

  await juriesCollection.updateOne(
    { _id: 'data' },
    { $set: { data: resetJuries } },
    { upsert: true }
  );

  console.log(`Reset ${target} sessions for ${resetJuries.length} jury account(s) in ${databaseName}.`);
} finally {
  await client.close();
}
