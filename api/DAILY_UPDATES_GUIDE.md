# Daily Knowledge Base Updates - Setup Guide

## Overview

The CoST Knowledge Hub automatically updates every night at midnight to keep your knowledge base fresh with the latest content. This ensures users always have access to the most recent news, articles, and updates.

---

## What Gets Updated Daily

### 1. **New Blog Articles** 📰
- Checks RSS feed for latest 20 articles
- Automatically indexes new content with publication dates
- Maintains author and category metadata
- **Cost**: ~$0.01-0.05 per day (only pays for new content)

### 2. **Recently Updated Pages** 🔄
- Monitors pages updated in last 7 days
- Re-crawls if content changes detected
- Updates existing documents seamlessly
- **Cost**: Minimal (only changed pages)

---

## Quick Setup (One-Time)

### Step 1: Run Setup Script
```bash
cd /Users/cengkurumichael/Dev/KH/api
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

This will:
- ✅ Create a macOS LaunchAgent (or Linux cron job)
- ✅ Schedule daily runs at midnight
- ✅ Set up logging directory
- ✅ Create monitoring helper script

### Step 2: Verify Setup
```bash
# Check if scheduled (macOS)
launchctl list | grep cost.knowledge-hub

# Check if scheduled (Linux)
crontab -l | grep daily:update
```

### Step 3: Test It
```bash
# Dry run (preview what would happen)
npm run daily:update:dry-run

# Or run live update now
npm run daily:update
```

---

## Monitoring

### Check Update Status
```bash
./scripts/check-daily-update.sh
```

### View Logs
```bash
# All logs
cat logs/daily-update.log

# Last 20 lines
tail -n 20 logs/daily-update.log

# Watch live
tail -f logs/daily-update.log
```

### Log Location
- **Standard output**: `logs/daily-update.log`
- **Errors**: `logs/daily-update-stderr.log`
- **stdout**: `logs/daily-update-stdout.log` (macOS)

---

## Manual Operations

### Run Update Manually
```bash
# Preview changes (safe, no database writes)
npm run daily:update:dry-run

# Run full update
npm run daily:update
```

### Disable Auto-Updates
```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.cost.knowledge-hub.daily-update.plist

# Linux
crontab -e  # Then comment out or remove the line
```

### Re-enable Auto-Updates
```bash
# macOS
launchctl load ~/Library/LaunchAgents/com.cost.knowledge-hub.daily-update.plist

# Linux
crontab -e  # Then uncomment the line
```

---

## How It Works

### Update Flow
```
┌─────────────────────────────────────────────┐
│ 1. Check RSS Feed for New Articles         │
│    - Fetch latest 20 articles               │
│    - Compare with existing URLs             │
│    - Find new articles                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Index New Blog Articles                  │
│    - Chunk content adaptively               │
│    - Generate embeddings (batch 500)        │
│    - Insert into MongoDB                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. Check Recently Updated Pages             │
│    - Find pages updated in last 7 days      │
│    - Re-crawl and compare content           │
│    - Update if changed                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. Log Results & Cost                       │
│    - Track articles processed               │
│    - Record embedding costs                 │
│    - Save to cost tracker                   │
└─────────────────────────────────────────────┘
```

### Performance
- **Speed**: 2-5 minutes typical (depends on new content)
- **Cost**: $0.01-0.10 per day (only new/changed content)
- **Impact**: Minimal (runs at midnight when traffic is low)

---

## Cost Management

### Daily Cost Estimate
| Scenario | New Articles | Approximate Cost |
|----------|--------------|------------------|
| Quiet day | 0-2 articles | $0.01-0.02 |
| Normal day | 3-5 articles | $0.03-0.05 |
| Busy day | 6-10 articles | $0.06-0.10 |
| Very busy | 10+ articles | $0.10-0.20 |

### Monthly Cost Estimate
- **Average**: $1-3 per month
- **Maximum**: $5-6 per month (very active content)

### Check Costs
```bash
# Today's update cost
npm run cost:today

# This week's costs
npm run cost:week

# Monthly budget status
npm run cost:budget
```

---

## Troubleshooting

### Updates Not Running
1. **Check if scheduled**:
   ```bash
   # macOS
   launchctl list | grep cost.knowledge-hub

   # Linux
   crontab -l
   ```

2. **Check logs for errors**:
   ```bash
   cat logs/daily-update-stderr.log
   ```

3. **Manually trigger to test**:
   ```bash
   npm run daily:update
   ```

### No New Articles Detected
- **Normal**: Website may not publish daily
- **Check**: RSS feed at https://infrastructuretransparency.org/feed/
- **Verify**: Run `npm run daily:update:dry-run` to see what would happen

### Embedding Errors
- **Check**: MongoDB connection in logs
- **Verify**: OpenAI API key is valid
- **Review**: `logs/daily-update-stderr.log` for details

### High Costs
- **Review**: `npm run cost:today` for breakdown
- **Adjust**: Reduce `MAX_BLOG_ARTICLES` in `scripts/daily-update.ts` (currently 20)
- **Monitor**: Weekly costs with `npm run cost:week`

---

## Advanced Configuration

### Change Update Time
Edit the schedule in the setup script:

**macOS** (`~/Library/LaunchAgents/com.cost.knowledge-hub.daily-update.plist`):
```xml
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>2</integer>  <!-- Change to desired hour (0-23) -->
    <key>Minute</key>
    <integer>30</integer> <!-- Change to desired minute (0-59) -->
</dict>
```

**Linux** (crontab):
```bash
crontab -e
# Change "0 0" to your desired time (hour minute)
# Example: "0 2" for 2:00 AM
30 2 * * * cd /path/to/project && npm run daily:update
```

### Change Article Limit
Edit `scripts/daily-update.ts`:
```typescript
const MAX_BLOG_ARTICLES = 20; // Increase or decrease
```

### Disable Page Update Checking
Edit `scripts/daily-update.ts` and comment out Step 2.

---

## Integration with Existing Features

### Works With:
- ✅ Vector search (automatically indexes with embeddings)
- ✅ Date-based filtering (preserves publication dates)
- ✅ "Latest news" queries (sorted by date)
- ✅ Cost tracking (logs all embedding costs)
- ✅ Quality checks (maintains data integrity)

### Complements:
- Full seeding (`npm run seed:discovered`)
- Blog RSS seeding (`npm run seed:blog:latest`)
- Manual updates when needed

---

## Best Practices

### ✅ Do:
- Monitor logs weekly: `./scripts/check-daily-update.sh`
- Review costs monthly: `npm run cost:month`
- Test before deploying: `npm run daily:update:dry-run`
- Keep logs under 100MB (rotate if needed)

### ❌ Don't:
- Run updates during peak hours (let it run at midnight)
- Disable without monitoring (you'll miss latest content)
- Ignore error logs (address issues promptly)
- Manually edit the database while update is running

---

## Support

### Check Status
```bash
# Quick status check
./scripts/check-daily-update.sh

# Detailed verification
npm run verify:setup
```

### Get Help
1. Check logs: `cat logs/daily-update.log`
2. Run dry run: `npm run daily:update:dry-run`
3. Verify setup: See troubleshooting section above

---

## Summary

🎉 **Your Knowledge Hub now updates automatically every midnight!**

- ✅ New articles indexed automatically
- ✅ Updated pages tracked and refreshed
- ✅ Costs minimized (only pay for new content)
- ✅ Fully logged and monitorable
- ✅ Zero manual intervention needed

**Next Steps:**
1. Run `./scripts/setup-cron.sh` to enable
2. Test with `npm run daily:update:dry-run`
3. Check tomorrow's logs to confirm it worked

Your users will always have access to the latest CoST news and updates! 🚀
