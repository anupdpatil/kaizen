import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { assertSelectedContest, readSourceSnapshot } from './dry-run-source-reader.js';
import { transformSnapshot } from './dry-run-transform.js';
import { validateDryRun } from './dry-run-validate.js';

const MODE = 'DRY_RUN';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

const getArgument = (name) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const redactUri = (uri) => uri.replace(/\/\/([^@/]+)@/, '//***@');

function readEnvironment() {
  const environment = getArgument('environment');
  const contestId = getArgument('contestId');
  if (!['development', 'production'].includes(environment)) throw new Error('Use --environment=development or --environment=production.');
  if (!contestId) throw new Error('Use --contestId=<existing contest ID>. The tool never selects a contest implicitly.');
  dotenv.config({ path: path.join(backendDir, '.env') });
  if (environment === 'development') dotenv.config({ path: path.join(backendDir, '.env.development.local'), override: true });
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const databaseName = process.env.MONGODB_DB_NAME;
  if (!uri || !databaseName) throw new Error('MongoDB URI and database name must be configured before a dry run can read source data.');
  if (environment === 'development' && !/dev/i.test(databaseName)) throw new Error(`Refusing development dry run because database "${databaseName}" is not clearly a development database.`);
  if (environment === 'production' && /dev/i.test(databaseName)) throw new Error(`Refusing production dry run because database "${databaseName}" looks like a development database.`);
  return { environment, contestId, uri, databaseName };
}

async function main() {
  if (MODE !== 'DRY_RUN') throw new Error(`Refusing migration mode ${MODE}; Phase 0.4 permits DRY_RUN only.`);
  const settings = readEnvironment();
  console.log('DRY RUN ONLY — NO DATABASE WRITES WILL BE PERFORMED.');
  console.log(`Mode: ${MODE}; environment: ${settings.environment}; database: ${settings.databaseName}; MongoDB target: ${redactUri(settings.uri)}`);
  const client = new MongoClient(settings.uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const snapshot = await readSourceSnapshot(client.db(settings.databaseName));
    assertSelectedContest(snapshot, settings.contestId);
    const transformed = transformSnapshot(snapshot, settings.contestId);
    const validation = validateDryRun(transformed);
    const report = {
      metadata: { mode: MODE, environment: settings.environment, databaseName: settings.databaseName, contestId: settings.contestId, generatedAt: new Date().toISOString() },
      sourceSummary: { contests: snapshot.contests.length, teams: snapshot.teams.length, juries: snapshot.juries.length, assignments: snapshot.assignments.length, activityLogs: snapshot.activityLogs.length },
      ...validation,
      targetRepresentations: transformed.target
    };
    const outputDirectory = path.join(backendDir, 'migration-reports');
    await fs.mkdir(outputDirectory, { recursive: true });
    const outputPath = path.join(outputDirectory, `dry-run-${settings.contestId}-${Date.now()}.json`);
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`Dry-run status: ${report.status}`);
    console.log(`Counts: ${JSON.stringify(report.counts)}`);
    console.log(`Warnings: ${report.warnings.length}; errors: ${report.validationErrors.length}`);
    console.log(`Local report: ${outputPath}`);
    process.exitCode = report.status === 'FAIL' ? 1 : 0;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Dry run aborted safely: ${error.message}`);
  process.exitCode = 1;
});
