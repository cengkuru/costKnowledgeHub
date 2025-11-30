# Claude API Integration - Quick Start Guide

## Setup (5 minutes)

### 1. Get API Key
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create account and generate API key

### 2. Update Environment
```bash
# Edit Api/.env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Install Dependencies
```bash
cd Api
npm install
```

### 4. Verify Installation
```bash
npm test -- src/services/__tests__/claudeService.test.ts
# Should show: Tests: 38 passed, 38 total
```

---

## Usage Patterns

### Pattern 1: Quick Question → Fast Answer
```typescript
import { analyzeQuery, chat } from './services/claudeService';

const query = 'What is OC4IDS?';
const analysis = await analyzeQuery(query); // Haiku (0.1s, $0.0001)
const response = await chat([{ role: 'user', content: query }], 'haiku'); // Haiku
```

### Pattern 2: Complex Question → Detailed Answer
```typescript
const response = await chat(
  [{ role: 'user', content: 'Explain OC4IDS implementation strategy' }],
  'opus' // More capable, slower
);
```

### Pattern 3: Long Text → Summary
```typescript
const summary = await summarize(longDocument, 200); // Haiku, $0.0003
```

### Pattern 4: Auto-Categorize on Upload
```typescript
const result = await categorize(
  userContent,
  ['Policy', 'Training', 'Data', 'Other']
);
// Returns: { category: 'Policy', confidence: 0.92, reasoning: '...' }
```

### Pattern 5: Real-time Streaming
```typescript
await streamChat(
  messages,
  (chunk) => res.write(chunk), // Stream to client
  'opus'
);
```

---

## Model Selection

| Task | Model | Speed | Cost | Use Case |
|------|-------|-------|------|----------|
| Simple Q&A | Haiku | 0.1s | $0.0001 | FAQs, search |
| Categorization | Haiku | 0.1s | $0.0002 | Auto-tagging |
| Summarization | Haiku | 0.5s | $0.0003 | Digest content |
| Complex reasoning | Opus | 2s | $0.002 | Policy analysis |
| Conversation | Opus | 2s | $0.002 | Chat, Q&A |

---

## Integration Examples

### Express Endpoint
```typescript
app.post('/api/analyze', async (req, res) => {
  const { content } = req.body;
  const analysis = await analyzeQuery(content);
  res.json(analysis);
});
```

### Batch Processing
```typescript
const documents = [...]; // 100+ items
const results = await batchProcess(
  documents,
  (doc) => categorize(doc.content, categories),
  10 // Process 10 at a time
);
```

### With Conversation History
```typescript
const history = [
  { role: 'user', content: 'What is OC4IDS?' },
  { role: 'assistant', content: '...' },
];
const response = await chat([
  ...history,
  { role: 'user', content: 'Explain further' }
], 'opus');
```

---

## Cost Tracking

### Log Every Request
```typescript
const response = await chat(messages);
console.log(`[COST] $${response.tokenUsage.estimatedCost.toFixed(6)}`);
```

### Session Summary
```typescript
const stats = getTokenUsageStats();
console.log(`Session cost: $${stats.totalCost.toFixed(6)}`);
console.log(`Avg tokens per request: ${stats.averageTokensPerRequest}`);
```

### Budget Alert
```typescript
if (stats.totalCost > 1.0) {
  console.warn('Budget alert: Over $1.00');
}
```

---

## Error Handling

```typescript
try {
  const response = await chat(messages);
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Wait and retry
    await new Promise(r => setTimeout(r, 5000));
  } else if (error.message.includes('Authentication')) {
    console.error('Check ANTHROPIC_API_KEY');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Performance Tips

1. **Use Haiku for fast tasks** (10x cheaper than Opus)
2. **Stream long responses** (better UX, same cost)
3. **Batch small requests** (rate limit: 600 requests/min)
4. **Reuse conversation history** (includes context in message count)
5. **Monitor token usage** (easy to overspend if careless)

---

## Common Tasks & Costs

| Task | Model | Input | Output | Total | Time |
|------|-------|-------|--------|-------|------|
| Q&A | Haiku | 50 | 100 | $0.0006 | 0.1s |
| Summarize 1000 chars | Haiku | 300 | 50 | $0.0003 | 0.3s |
| Categorize | Haiku | 100 | 50 | $0.0001 | 0.1s |
| Chat | Opus | 200 | 300 | $0.0045 | 1s |

**Typical API: ~$0.01-0.05 per request**

---

## Troubleshooting

### "ANTHROPIC_API_KEY is required"
```bash
# Check .env file has key
grep ANTHROPIC_API_KEY Api/.env

# Or set in code
initClaudeClient({ apiKey: 'sk-ant-...' })
```

### "Rate limit exceeded"
- Automatic retry with backoff (built-in)
- Or wait 60 seconds before retry
- Batch processing adds 100ms delays

### "Invalid API Key"
- Check key starts with `sk-ant-`
- Generate new key at console.anthropic.com
- Verify no extra spaces in .env

### Tests failing
```bash
# Clear jest cache
npx jest --clearCache

# Run with verbose output
npm test -- --verbose
```

---

## Production Checklist

- [ ] Add API key to `.env` (never in code)
- [ ] Set up monitoring/logging for token usage
- [ ] Add rate limiting for public endpoints
- [ ] Cache summarized content to reduce calls
- [ ] Add cost alerts if usage spikes
- [ ] Test error handling for API outages
- [ ] Monitor response latency in production
- [ ] Document API usage expectations

---

## Resources

- Docs: https://docs.anthropic.com
- Models: https://docs.anthropic.com/claude/reference/models-overview
- Pricing: https://www.anthropic.com/pricing
- Status: https://status.anthropic.com

---

**Setup Status**: ✅ Complete - 38/38 tests passing
**Ready to integrate**: Yes
**Example code**: See CLAUDE_API_INTEGRATION.md
