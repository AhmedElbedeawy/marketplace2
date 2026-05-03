/**
 * One-time migration script: OrderRating index
 *
 * Changes:
 *   BEFORE: unique index on { order: 1 } alone  (blocks multi-cook ratings)
 *   AFTER:  unique index on { order: 1, cook: 1 } (one rating doc per order per cook)
 *
 * Safety:
 *   - Reads/writes indexes only. No documents are touched.
 *   - No other collection is accessed.
 *   - If the old "order_1" index does not exist, the script prints existing indexes and continues.
 *
 * Usage (run from the server directory):
 *   cd server && node scripts/migrateOrderRatingIndex.js
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const DB_NAME = 'test';
const OLD_INDEX_NAME = 'order_1';
const NEW_INDEX_NAME = 'order_1_cook_1';
const COLLECTION = 'orderratings';

async function printIndexes(collection, label) {
  const indexes = await collection.indexes();
  console.log(`\n📋 ${label}:`);
  indexes.forEach((idx) => {
    console.log(`   name="${idx.name}"  key=${JSON.stringify(idx.key)}  unique=${!!idx.unique}`);
  });
}

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGO_URI is not set. Make sure server/.env exists and contains MONGO_URI=...');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.');

  // Explicitly select the target database — do not rely on MONGO_URI pathname
  const db = mongoose.connection.useDb(DB_NAME);
  console.log(`🗄️  Using database: "${db.name}"`);

  const collection = db.collection(COLLECTION);

  await printIndexes(collection, 'Current indexes BEFORE migration');

  // Check whether the old single-field index exists
  const allIndexes = await collection.indexes();
  const oldExists = allIndexes.some((idx) => idx.name === OLD_INDEX_NAME);
  const newExists = allIndexes.some((idx) => idx.name === NEW_INDEX_NAME);

  if (newExists) {
    console.log(`\n✅ Compound index "${NEW_INDEX_NAME}" already exists. Nothing to do.`);
    await printIndexes(collection, 'Final indexes (no changes made)');
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected. Done.');
    return;
  }

  if (!oldExists) {
    console.log(`\n⚠️  Index "${OLD_INDEX_NAME}" not found — skipping drop step.`);
    console.log('   Existing index names:', allIndexes.map((i) => i.name).join(', '));
  } else {
    console.log(`\n🗑️  Dropping old index "${OLD_INDEX_NAME}"...`);
    await collection.dropIndex(OLD_INDEX_NAME);
    console.log(`✅ Dropped "${OLD_INDEX_NAME}".`);
  }

  console.log(`\n🔨 Creating compound unique index "${NEW_INDEX_NAME}" on { order: 1, cook: 1 }...`);
  await collection.createIndex(
    { order: 1, cook: 1 },
    { unique: true, name: NEW_INDEX_NAME }
  );
  console.log(`✅ Created "${NEW_INDEX_NAME}".`);

  await printIndexes(collection, 'Final indexes AFTER migration');

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected. Migration complete.');
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
