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

// Load the same target-specific overrides used by the application launchers.
// Production remains the default, while development explicitly targets the
// isolated development database.
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({
  path: path.join(
    __dirname,
    target === 'development' ? '../.env.development.local' : '../.env.production-data.local'
  ),
  override: true
});

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

  const adminsCollection = database.collection('admins');
  const adminDocument = await adminsCollection.findOne({ _id: 'data' });
  const admins = Array.isArray(adminDocument?.data) ? adminDocument.data : [];
  await adminsCollection.updateOne(
    { _id: 'data' },
    {
      $set: {
        data: admins.map((admin) => ({
          ...admin,
          sessionId: null,
          sessionExpiresAt: null
        }))
      }
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
