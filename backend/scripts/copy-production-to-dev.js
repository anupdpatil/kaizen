import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const CONFIRMATION_FLAG = '--confirm-copy-production-to-development';
const COLLECTIONS = [
  'contests',
  'juries',
  'teams',
  'hall_assignments',
  'evaluations',
  'state',
  'activity_logs'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

if (!process.argv.includes(CONFIRMATION_FLAG)) {
  throw new Error(
    `Refusing to overwrite development data. Re-run with ${CONFIRMATION_FLAG}.`
  );
}

// The base backend environment points at production. The local development
// override supplies the destination database (normally kaizen_dev).
dotenv.config({ path: path.join(backendDir, '.env') });
const productionUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const productionDatabaseName = process.env.MONGODB_DB_NAME || 'kaizen';

dotenv.config({
  path: path.join(backendDir, '.env.development.local'),
  override: true
});
const developmentUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const developmentDatabaseName = process.env.MONGODB_DB_NAME;

if (!productionUri || !developmentUri || !developmentDatabaseName) {
  throw new Error('Production and development MongoDB configuration is required.');
}

if (productionUri === developmentUri && productionDatabaseName === developmentDatabaseName) {
  throw new Error('Production and development databases must be different.');
}

if (!/dev/i.test(developmentDatabaseName)) {
  throw new Error('Refusing to overwrite a database whose name does not identify it as development.');
}

const productionClient = new MongoClient(productionUri, { serverSelectionTimeoutMS: 10000 });
const developmentClient = new MongoClient(developmentUri, { serverSelectionTimeoutMS: 10000 });

try {
  await Promise.all([productionClient.connect(), developmentClient.connect()]);

  const productionDatabase = productionClient.db(productionDatabaseName);
  const developmentDatabase = developmentClient.db(developmentDatabaseName);

  const [productionData, developmentBackup] = await Promise.all([
    Promise.all(
      COLLECTIONS.map(async (collectionName) => [
        collectionName,
        await productionDatabase.collection(collectionName).find({}).toArray()
      ])
    ),
    Promise.all(
      COLLECTIONS.map(async (collectionName) => [
        collectionName,
        await developmentDatabase.collection(collectionName).find({}).toArray()
      ])
    )
  ]);

  const backupDirectory = path.join(backendDir, 'data', 'development-backups');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(
    backupDirectory,
    `before-production-copy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  await fs.writeFile(
    backupPath,
    JSON.stringify(Object.fromEntries(developmentBackup), null, 2)
  );

  for (const [collectionName, documents] of productionData) {
    const destinationCollection = developmentDatabase.collection(collectionName);
    await destinationCollection.deleteMany({});

    // Session records must never be copied: they would lock local users out
    // and could make a local token valid against production data.
    const safeDocuments = documents.map((document) => {
      if (collectionName === 'state' && document.data) {
        return {
          ...document,
          data: {
            ...document.data,
            adminSessionId: null,
            adminSessionExpiresAt: null,
            sessionVersion: Number(document.data.sessionVersion || 0) + 1
          }
        };
      }

      if (collectionName === 'juries' && Array.isArray(document.data)) {
        return {
          ...document,
          data: document.data.map((jury) => ({
            ...jury,
            sessionId: null,
            sessionExpiresAt: null
          }))
        };
      }

      return document;
    });

    if (safeDocuments.length) {
      await destinationCollection.insertMany(safeDocuments);
    }
  }

  console.log(
    `Copied ${COLLECTIONS.length} collections from ${productionDatabaseName} to ${developmentDatabaseName}.`
  );
  console.log(`Development backup written to ${backupPath}.`);
} finally {
  await Promise.all([productionClient.close(), developmentClient.close()]);
}
