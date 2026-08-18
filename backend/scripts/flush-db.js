// #!/usr/bin/env node

// import 'dotenv/config';
// import { MongoClient } from 'mongodb';

// const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
// const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'kaizen';

// if (!MONGODB_URI) {
//   console.error('❌ Error: MONGODB_URI is not configured');
//   process.exit(1);
// }

// const collectionsToFlush = [
//   'contests',
//   'juries',
//   'teams',
//   'hall_assignments',
//   'evaluations',
//   'state',
//   'activity_logs'
// ];

// async function flushDatabase() {
//   const client = new MongoClient(MONGODB_URI);

//   try {
//     await client.connect();
//     console.log(`🔗 Connected to MongoDB database: ${MONGODB_DB_NAME}`);

//     const db = client.db(MONGODB_DB_NAME);

//     // Flush each collection
//     for (const collectionName of collectionsToFlush) {
//       try {
//         const collection = db.collection(collectionName);
//         const result = await collection.deleteMany({});
//         console.log(`✓ Flushed '${collectionName}' - Deleted ${result.deletedCount} documents`);
//       } catch (error) {
//         if (!error.message.includes('does not exist')) {
//           console.warn(`⚠ Warning while flushing '${collectionName}':`, error.message);
//         }
//       }
//     }

//     console.log('\n✅ Database flush completed successfully!');
//     console.log('ℹ️  All collections have been cleared.');
//     console.log('📝 Next: Start the application to initialize with fresh data.');

//   } catch (error) {
//     console.error('❌ Error flushing database:', error.message);
//     process.exit(1);
//   } finally {
//     await client.close();
//   }
// }

// flushDatabase();
