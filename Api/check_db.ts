import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('No MONGODB_URI found');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'infrascope');
    const collection = db.collection('resources');

    const count = await collection.countDocuments();
    console.log(`Total resources in DB: ${count}`);

    const assuranceCount = await collection.countDocuments({ category: 'Assurance' });
    console.log(`Assurance resources: ${assuranceCount}`);

    const assuranceResources = await collection.find({ category: 'Assurance' }).toArray();
    console.log('\nAssurance resources:');
    assuranceResources.forEach(r => {
        console.log(`  ${r.id}: ${r.title}`);
    });

    await client.close();
}

checkDB().catch(console.error);
