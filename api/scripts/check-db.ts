import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://michael_db_user:EYVLouWU8unUsEet@infralens.zoul60d.mongodb.net/?retryWrites=true&w=majority&appName=infraLens';
const client = new MongoClient(uri);

async function check() {
  try {
    await client.connect();
    const db = client.db('infrascope');
    const coll = db.collection('docs');
    
    console.log('\n=== Database Check ===');
    const count = await coll.countDocuments();
    console.log('Total documents:', count);
    
    if (count > 0) {
      const sample = await coll.findOne({});
      console.log('\nSample document:');
      console.log('- Title:', sample.title);
      console.log('- Has embedding:', !!sample.embedding);
      console.log('- Embedding dimensions:', sample.embedding?.length || 0);
      console.log('- Type:', sample.type);
      console.log('- Country:', sample.country);
      console.log('- Year:', sample.year);
    }
    
    console.log('\n=== Index Check ===');
    const indexes = await coll.listIndexes().toArray();
    console.log('Total indexes:', indexes.length);
    indexes.forEach(idx => {
      console.log(`- ${idx.name}`);
    });
    
    const vectorIndex = indexes.find(idx => idx.name === 'embedding_index');
    if (vectorIndex) {
      console.log('\n✅ Vector index "embedding_index" EXISTS');
    } else {
      console.log('\n❌ Vector index "embedding_index" NOT FOUND');
      console.log('\n📝 To create it:');
      console.log('1. Go to MongoDB Atlas → Atlas Search tab');
      console.log('2. Create Vector Search Index');
      console.log('3. Use config from: vector-index-config.json');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

check();
