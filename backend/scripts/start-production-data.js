import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({
  path: path.join(__dirname, '../.env.production-data.local'),
  override: true
});

if (process.env.PRODUCTION_DATABASE_CONFIRMATION !== 'I_UNDERSTAND_THIS_EDITS_PRODUCTION') {
  throw new Error('Production-data mode requires the local confirmation value.');
}

if (!process.env.PRODUCTION_WRITE_KEY || process.env.MONGODB_DB_NAME === 'kaizen_dev') {
  throw new Error('Production-data mode requires a write key and a non-development database.');
}

process.env.DATABASE_TARGET = 'production';
await import('../src/index.js');
