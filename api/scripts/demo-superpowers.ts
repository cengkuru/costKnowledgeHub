import { synthesizeAnswer } from '../src/services/answer.js';
import { analyzeCostAlignment } from '../src/services/cost-dna-analyzer.js';
import { buildLivingContext } from '../src/services/living-context.js';
import { buildTimeOracleInsights } from '../src/services/time-oracle.js';
import { embed } from '../src/services/embedder.js';
import { closeMongo, vectorSearch } from '../src/services/vectorStore.js';
import { Snippet } from '../src/types.js';

const DEFAULT_QUERY = 'How should CoST approach proactive disclosure for major road projects?';

const parseArgs = (): { query: string } => {
  const [, , ...rest] = process.argv;
  const query = rest.join(' ').trim();
  return { query: query || DEFAULT_QUERY };
};

const toSnippets = (docs: Awaited<ReturnType<typeof vectorSearch>>['results']): Snippet[] =>
  docs.slice(0, 6).map(doc => ({
    title: doc.title,
    url: doc.url,
    text: doc.text ?? ''
  }));

const prettyPrint = (label: string, payload: unknown): void => {
  console.log(`\n=== ${label} ===`);
  console.dir(payload, { depth: null, colors: true });
};

const main = async (): Promise<void> => {
  const { query } = parseArgs();
  console.log(`🚀 Demoing CoST superpowers for query: "${query}"`);

  const embedding = await embed(query) as number[];
  const { results } = await vectorSearch({
    qEmbedding: embedding,
    limit: 30
  });

  if (!results.length) {
    console.warn('No documents retrieved from vector search, aborting.');
    return;
  }

  const snippets = toSnippets(results);
  const answer = await synthesizeAnswer(query, snippets);

  const livingContext = await buildLivingContext(query, results);
  const timeOracle = await buildTimeOracleInsights(query, results, {
    livingContext: livingContext.summary
  });
  const costAlignment = await analyzeCostAlignment({
    query,
    answer: answer.answer,
    livingContext: livingContext.summary,
    temporalInsights: timeOracle
  });

  prettyPrint('Synthesized Answer', answer.answer);
  prettyPrint('Living Context Summary', livingContext.summary);
  prettyPrint('CoST DNA Alignment', costAlignment);
  prettyPrint('Time Oracle Insights', timeOracle);

  console.log('\n✅ Demo complete.');
};

main()
  .catch(error => {
    console.error('Demo failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongo().catch(err => {
      console.error('Failed to close Mongo connection:', err);
    });
  });
