const mongoose = require('mongoose');

const OLD_URI = 'mongodb+srv://bharatsharma:Netrutv123@users.zhyvuoo.mongodb.net/purna_full?retryWrites=true&w=majority';

const ATLAS_URI = "mongodb+srv://<purnavillage_db_user>:<PurnaVoter2026>@cluster0.myu0qt6.mongodb.net/?appName=Cluster0";

const COLLECTIONS = ['Voter', 'Voters', 'logs', 'uploads', 'users', 'voters'];

async function migrate() {
  let oldConn, newConn;
  try {
    console.log('🔌 Connecting to OLD Atlas...');
    oldConn = await mongoose.createConnection(OLD_URI).asPromise();
    console.log('✅ Connected to OLD cluster\n');

    console.log('🔌 Connecting to NEW Atlas...');
    newConn = await mongoose.createConnection(NEW_URI).asPromise();
    console.log('✅ Connected to NEW cluster\n');

    const summary = [];

    for (const collectionName of COLLECTIONS) {
      try {
        console.log(`📦 Migrating: [${collectionName}]`);

        const OldModel = oldConn.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);
        const docs = await OldModel.find({}).lean();

        if (docs.length === 0) {
          console.log(`   ⚠️  Empty — skipping\n`);
          summary.push({ collection: collectionName, count: 0, status: 'skipped' });
          continue;
        }

        console.log(`   📄 Found ${docs.length} documents`);

        const NewModel = newConn.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);

        const BATCH_SIZE = 500;
        let inserted = 0;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = docs.slice(i, i + BATCH_SIZE);
          await NewModel.insertMany(batch, { ordered: false });
          inserted += batch.length;
          process.stdout.write(`   ✍️  Inserted ${inserted}/${docs.length}\r`);
        }

        console.log(`\n   ✅ Done!\n`);
        summary.push({ collection: collectionName, count: docs.length, status: '✅ success' });

      } catch (err) {
        console.error(`   ❌ Error on [${collectionName}]:`, err.message, '\n');
        summary.push({ collection: collectionName, count: 0, status: `❌ failed` });
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('         MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════');
    summary.forEach(({ collection, count, status }) => {
      console.log(`  ${collection.padEnd(12)} | ${String(count).padStart(6)} docs | ${status}`);
    });
    console.log('═══════════════════════════════════════\n✨ Done!');

  } catch (err) {
    console.error('❌ Fatal:', err.message);
  } finally {
    if (oldConn) await oldConn.close();
    if (newConn) await newConn.close();
    process.exit(0);
  }
}

migrate();