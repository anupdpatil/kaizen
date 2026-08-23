import 'dotenv/config';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'kaizen';

// Mutation queue to prevent concurrent writes
let writeLock = Promise.resolve();

class Database {
  constructor() {
    this.dataDir = DATA_DIR;
    this.tables = {
      contests: 'contests.json',
      juries: 'juries.json',
      teams: 'teams.json',
      hall_assignments: 'hall_assignments.json',
      evaluations: 'evaluations.json',
      state: 'state.json'
    };
    this.mongoCollections = {
      contests: 'contests',
      juries: 'juries',
      teams: 'teams',
      hall_assignments: 'hall_assignments',
      evaluations: 'evaluations',
      state: 'state',
      activity_logs: 'activity_logs'
    };
    this.client = null;
    this.db = null;
    this.useMongo = Boolean(MONGODB_URI);
    if (!this.useMongo) {
      throw new Error('MONGODB_URI is not configured. MongoDB-only mode is enabled.');
    }
  }

  async connectMongo() {
    if (!this.useMongo) {
      return false;
    }

    if (this.db) {
      return true;
    }

    try {
      this.client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      await this.client.connect();
      this.db = this.client.db(MONGODB_DB_NAME);
      console.log(`MongoDB connected to database: ${MONGODB_DB_NAME}`);
      return true;
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async ensureMongoCollections() {
    if (!this.useMongo) {
      return;
    }

    const connected = await this.connectMongo();
    if (!connected) {
      return;
    }

    for (const collectionName of Object.values(this.mongoCollections)) {
      try {
        await this.db.createCollection(collectionName);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  async init() {
    if (!this.useMongo) {
      throw new Error('MongoDB-only mode is enabled but MONGODB_URI is missing.');
    }

    const connected = await this.connectMongo();
    if (connected) {
      await this.ensureMongoCollections();
      return;
    }

    throw new Error('MongoDB initialization failed.');
  }

  async getTablePath(tableName) {
    if (!this.tables[tableName]) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    return path.join(this.dataDir, this.tables[tableName]);
  }

  async getCollection(tableName) {
    const collectionName = this.mongoCollections[tableName];
    if (!collectionName) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    const connected = await this.connectMongo();
    if (!connected) {
      throw new Error('MongoDB not available');
    }

    return this.db.collection(collectionName);
  }

  async getTable(tableName) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      const doc = await collection.findOne({});

      if (tableName === 'evaluations' || tableName === 'state') {
        return doc ? doc.data : {};
      }

      if (!doc) {
        return [];
      }

      return Array.isArray(doc.data) ? doc.data : [];
    }

    const filePath = await this.getTablePath(tableName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async setTable(tableName, data) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      const target = tableName === 'evaluations' || tableName === 'state' ? {} : { _id: 'data' };

      if (tableName === 'evaluations' || tableName === 'state') {
        await collection.updateOne({}, { $set: { data } }, { upsert: true });
        return;
      }

      await collection.updateOne({ _id: 'data' }, { $set: { data } }, { upsert: true });
      return;
    }

    // Use mutation queue to prevent concurrent writes
    writeLock = writeLock.then(async () => {
      const filePath = await this.getTablePath(tableName);
      const tempPath = `${filePath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
      await fs.rename(tempPath, filePath);
    });

    return writeLock;
  }

  async setEvaluation(teamId, juryId, evaluation) {
    if (!teamId || !juryId) {
      throw new Error('teamId and juryId are required to save an evaluation');
    }

    if (this.useMongo) {
      const collection = await this.getCollection('evaluations');
      const fieldPath = `data.${teamId}.${juryId}`;
      await collection.updateOne({}, { $set: { [fieldPath]: evaluation } }, { upsert: true });
      return;
    }

    // Keep the read-modify-write operation together when using file storage.
    writeLock = writeLock.then(async () => {
      const evaluations = await this.getTable('evaluations');
      evaluations[teamId] = { ...(evaluations[teamId] || {}), [juryId]: evaluation };
      const filePath = await this.getTablePath('evaluations');
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(evaluations, null, 2));
      await fs.rename(tempPath, filePath);
    });

    return writeLock;
  }

  async create(tableName, record) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      const existing = await this.getTable(tableName);
      const next = Array.isArray(existing) ? [...existing, record] : [record];
      await this.setTable(tableName, next);
      return record;
    }

    const table = await this.getTable(tableName);
    table.push(record);
    await this.setTable(tableName, table);
    return record;
  }

  async update(tableName, id, updates) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      const existing = await this.getTable(tableName);
      const index = existing.findIndex(item => item.id === id);
      if (index === -1) return null;

      existing[index] = { ...existing[index], ...updates };
      await this.setTable(tableName, existing);
      return existing[index];
    }

    const table = await this.getTable(tableName);
    const index = table.findIndex(item => item.id === id);
    if (index === -1) return null;

    table[index] = { ...table[index], ...updates };
    await this.setTable(tableName, table);
    return table[index];
  }

  async delete(tableName, id) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      const existing = await this.getTable(tableName);
      const index = existing.findIndex(item => item.id === id);
      if (index === -1) return false;

      existing.splice(index, 1);
      await this.setTable(tableName, existing);
      return true;
    }

    const table = await this.getTable(tableName);
    const index = table.findIndex(item => item.id === id);
    if (index === -1) return false;

    table.splice(index, 1);
    await this.setTable(tableName, table);
    return true;
  }

  async getAllData() {
    // The initial dashboard hydration needs every collection. Fetch them at
    // once so network latency to MongoDB is paid once rather than once per
    // collection (plus activity logs).
    const tableNames = Object.keys(this.tables);
    const tableData = await Promise.all(
      tableNames.map((tableName) => this.getTable(tableName))
    );
    const activityLogs = await this.getActivityLogs();

    return {
      ...Object.fromEntries(
        tableNames.map((tableName, index) => [tableName, tableData[index]])
      ),
      activity_logs: activityLogs
    };
  }

  async getActivityLogs() {
    if (this.useMongo) {
      const collection = await this.getCollection('activity_logs');
      return collection.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    }

    const filePath = path.join(this.dataDir, 'activity_logs.json');
    if (!fsSync.existsSync(filePath)) {
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
    }

    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async setAllData(snapshot) {
    for (const [tableName, data] of Object.entries(snapshot)) {
      if (this.tables[tableName]) {
        await this.setTable(tableName, data);
      }
    }

    if (snapshot.activity_logs) {
      if (this.useMongo) {
        const collection = await this.getCollection('activity_logs');
        await collection.deleteMany({});
        if (snapshot.activity_logs.length) {
          await collection.insertMany(snapshot.activity_logs);
        }
      } else {
        const filePath = path.join(this.dataDir, 'activity_logs.json');
        await fs.writeFile(filePath, JSON.stringify(snapshot.activity_logs, null, 2));
      }
    }
  }

  async find(tableName, predicate) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      return collection.findOne(predicate);
    }

    const table = await this.getTable(tableName);
    return table.find(predicate);
  }

  async findAll(tableName, predicate) {
    if (this.useMongo) {
      const collection = await this.getCollection(tableName);
      return collection.find(predicate).toArray();
    }

    const table = await this.getTable(tableName);
    return table.filter(predicate);
  }
}

export default new Database();
