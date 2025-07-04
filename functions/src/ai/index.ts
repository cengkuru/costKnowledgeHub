// AI-powered features for resource documentation
export { generateMultiLanguageSummary } from './summaryGenerator';
export { suggestTags } from './tagSuggester';

// Health check endpoint for AI availability
import { onRequest } from 'firebase-functions/v2/https';

export const healthCheck = onRequest({
  cors: [
    'http://localhost:4200',
    'http://localhost:5000',
    'https://knowledgehub-2ed2f.web.app',
    'https://knowledgehub-2ed2f.firebaseapp.com'
  ],
  memory: '128MiB',
  timeoutSeconds: 10
}, async (req, res) => {
  // Handle CORS preflight for OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
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