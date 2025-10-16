#!/bin/bash
###############################################################################
# Daily Knowledge Base Update Script
#
# Automated daily crawler for new CoST infrastructure transparency content
# - Runs incremental seeding (only new resources)
# - Performs quality checks
# - Tracks costs
# - Sends alerts if issues detected
#
# Schedule with cron:
#   0 2 * * * /path/to/daily-update.sh >> /var/log/cost-kb-update.log 2>&1
#
# (Runs daily at 2 AM)
###############################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
DATE=$(date +%Y-%m-%d)
MONTHLY_BUDGET=10.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

log "╔════════════════════════════════════════════════════════════╗"
log "║  CoST Knowledge Base - Daily Update                        ║"
log "╚════════════════════════════════════════════════════════════╝"
log ""

# Change to project directory
cd "$PROJECT_ROOT"

# Step 1: Check budget before proceeding
log "Step 1: Checking monthly budget..."
if command -v tsx &> /dev/null; then
  BUDGET_CHECK=$(tsx scripts/monitoring/cost-tracker.ts budget "$MONTHLY_BUDGET" 2>&1 || true)
  echo "$BUDGET_CHECK"

  if echo "$BUDGET_CHECK" | grep -q "Monthly budget exceeded"; then
    error "Monthly budget exceeded! Skipping update to prevent overspending."
    exit 1
  fi

  if echo "$BUDGET_CHECK" | grep -q "Budget at 80%"; then
    warn "Budget at 80%+ capacity. Proceed with caution."
  fi
else
  warn "tsx not found, skipping budget check"
fi

log ""

# Step 2: Run database indexes (ensure no duplicates)
log "Step 2: Ensuring database indexes..."
if command -v tsx &> /dev/null; then
  tsx scripts/db/ensure-indexes.ts || {
    error "Failed to ensure indexes"
    exit 1
  }
else
  error "tsx not found, cannot ensure indexes"
  exit 1
fi

log ""

# Step 3: Run incremental seeding
log "Step 3: Running incremental seed (new resources only)..."
START_TIME=$(date +%s)

tsx scripts/seed-incremental.ts > "$LOG_DIR/seed-$DATE.log" 2>&1 || {
  error "Incremental seeding failed! Check logs at $LOG_DIR/seed-$DATE.log"
  exit 1
}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "Seeding completed in ${DURATION}s"
log ""

# Step 4: Quality checks
log "Step 4: Running quality assurance checks..."
tsx scripts/qa/quality-checks.ts > "$LOG_DIR/qa-$DATE.log" 2>&1 || {
  warn "Quality checks had warnings. See $LOG_DIR/qa-$DATE.log"
}

# Extract health score from QA log
HEALTH_SCORE=$(grep "Health Score:" "$LOG_DIR/qa-$DATE.log" | grep -oE '[0-9]+\.[0-9]+' || echo "0")
log "Data health score: ${HEALTH_SCORE}%"

if (( $(echo "$HEALTH_SCORE < 80" | bc -l) )); then
  warn "Health score below 80%! Manual review recommended."
fi

log ""

# Step 5: Update cost tracking
log "Step 5: Logging costs..."
tsx scripts/monitoring/cost-tracker.ts today > "$LOG_DIR/cost-$DATE.log" 2>&1 || {
  warn "Cost tracking had issues"
}

log ""

# Step 6: Cleanup old logs (keep last 30 days)
log "Step 6: Cleaning up old logs..."
find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete
log "Old logs cleaned"

log ""

# Summary
log "╔════════════════════════════════════════════════════════════╗"
log "║  Daily Update Complete                                     ║"
log "╚════════════════════════════════════════════════════════════╝"
log ""
log "Summary:"
log "  - Duration: ${DURATION}s"
log "  - Health Score: ${HEALTH_SCORE}%"
log "  - Logs: $LOG_DIR"
log ""

# Optional: Send notification (uncomment and configure)
# if [ -n "$SLACK_WEBHOOK" ]; then
#   curl -X POST -H 'Content-type: application/json' \
#     --data "{\"text\":\"CoST KB Update: Health ${HEALTH_SCORE}% | Duration ${DURATION}s\"}" \
#     "$SLACK_WEBHOOK"
# fi

exit 0
