import 'dotenv/config';
import { connectMongo } from '../src/services/vectorStore.js';

async function checkDocs() {
  const collection = await connectMongo();
  const docs = await collection.find({}).limit(2).toArray();

  console.log('Sample documents:\n');
  docs.forEach((doc, i) => {
    console.log(`Document ${i + 1}:`);
    console.log('Fields:', Object.keys(doc));
    console.log('Title:', doc.title);
    console.log('Has text:', !!doc.text);
    console.log('Text length:', doc.text?.length || 0);
    console.log('Text preview:', doc.text?.substring(0, 100));
    console.log('\n---\n');
  });

  process.exit(0);
}

checkDocs();
