import 'dotenv/config';
import { embed } from '../src/services/embedder.js';
import { vectorSearch } from '../src/services/vectorStore.js';
import { synthesizeAnswer } from '../src/services/answer.js';

async function testAnswerSynthesis() {
  console.log('Testing answer synthesis with real data...\n');

  const query = 'What is OC4IDS?';
  console.log(`Query: "${query}"\n`);

  // Get vector results
  const qEmbedding = await embed(query) as number[];
  const { results } = await vectorSearch({
    qEmbedding,
    limit: 5,
    offset: 0,
    filters: {}
  });

  console.log(`Found ${results.length} results\n`);

  // Check what fields we have
  console.log('Sample result fields:', Object.keys(results[0]));
  console.log('Has text:', !!results[0].text);
  console.log('Text type:', typeof results[0].text);
  console.log('Text length:', results[0].text?.length || 0);
  console.log('Text preview:', results[0].text?.substring(0, 200));
  console.log('\n---\n');

  // Prepare snippets
  const snippets = results.map(h => ({
    title: h.title,
    url: h.url,
    text: h.text
  }));

  console.log('Snippets to send to synthesis:');
  snippets.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   Has text: ${!!s.text}, Length: ${s.text?.length || 0}`);
  });
  console.log('\n---\n');

  // Synthesize answer
  console.log('Calling synthesizeAnswer...\n');
  const answerPayload = await synthesizeAnswer(query, snippets);

  console.log('Answer result:');
  console.log(JSON.stringify(answerPayload, null, 2));

  process.exit(0);
}

testAnswerSynthesis();
