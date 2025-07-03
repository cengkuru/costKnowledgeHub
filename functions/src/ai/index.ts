// AI-powered features for resource documentation
export { generateMultiLanguageSummary } from './summaryGenerator';
export { suggestTags } from './tagSuggester';

// Health check endpoint for AI availability
import { onRequest } from 'firebase-functions/v2/https';

export const healthCheck = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 10
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  // Check if Gemini API key is configured
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  res.json({
    available: hasApiKey,
    features: {
      multiLanguageSummaries: hasApiKey,
      tagSuggestions: hasApiKey
    },
    timestamp: new Date().toISOString()
  });
});