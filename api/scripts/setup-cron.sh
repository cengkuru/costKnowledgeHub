#!/bin/bash
################################################################################
# CoST Knowledge Hub - Daily Update Cron Setup
################################################################################
#
# This script sets up automatic daily updates at midnight
#
# Usage:
#   chmod +x scripts/setup-cron.sh
#   ./scripts/setup-cron.sh
#
################################################################################

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  CoST Knowledge Hub - Cron Setup                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="macOS"
  CRON_SERVICE="launchd"
else
  PLATFORM="Linux"
  CRON_SERVICE="cron"
fi

echo "🖥️  Platform detected: $PLATFORM"
echo "⚙️  Using: $CRON_SERVICE"
echo ""

# Create log directory
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
echo "✅ Log directory created: $LOG_DIR"
echo ""

# Option 1: macOS LaunchAgent
if [[ "$PLATFORM" == "macOS" ]]; then
  echo "Setting up macOS LaunchAgent..."
  echo ""

  PLIST_FILE="$HOME/Library/LaunchAgents/com.cost.knowledge-hub.daily-update.plist"

  cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cost.knowledge-hub.daily-update</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $PROJECT_DIR && npm run daily:update >> $LOG_DIR/daily-update.log 2>&1</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/daily-update-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/daily-update-stderr.log</string>
</dict>
</plist>
EOF

  echo "✅ LaunchAgent plist created: $PLIST_FILE"
  echo ""

  # Load the LaunchAgent
  launchctl unload "$PLIST_FILE" 2>/dev/null
  launchctl load "$PLIST_FILE"

  echo "✅ LaunchAgent loaded and scheduled"
  echo ""
  echo "📋 To check status:"
  echo "   launchctl list | grep cost.knowledge-hub"
  echo ""
  echo "📋 To manually trigger:"
  echo "   launchctl start com.cost.knowledge-hub.daily-update"
  echo ""
  echo "📋 To remove:"
  echo "   launchctl unload $PLIST_FILE"
  echo ""

# Option 2: Linux Cron
else
  echo "Setting up Linux cron job..."
  echo ""

  CRON_JOB="0 0 * * * cd $PROJECT_DIR && npm run daily:update >> $LOG_DIR/daily-update.log 2>&1"

  # Check if cron job already exists
  if crontab -l 2>/dev/null | grep -q "npm run daily:update"; then
    echo "⚠️  Cron job already exists. Updating..."
    (crontab -l 2>/dev/null | grep -v "npm run daily:update"; echo "$CRON_JOB") | crontab -
  else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  fi

  echo "✅ Cron job added successfully"
  echo ""
  echo "📋 Current crontab:"
  crontab -l | grep "daily:update"
  echo ""
  echo "📋 To view all cron jobs:"
  echo "   crontab -l"
  echo ""
  echo "📋 To edit cron jobs:"
  echo "   crontab -e"
  echo ""
fi

# Create monitoring script
echo "Creating monitoring helper script..."
MONITOR_SCRIPT="$PROJECT_DIR/scripts/check-daily-update.sh"

cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash
# Check status of daily updates

LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/logs"

echo "📊 Daily Update Status"
echo "===================="
echo ""

if [ -f "$LOG_DIR/daily-update.log" ]; then
  echo "📝 Last 20 lines of update log:"
  echo "----------------------------"
  tail -n 20 "$LOG_DIR/daily-update.log"
  echo ""

  echo "📅 Last update time:"
  ls -lh "$LOG_DIR/daily-update.log" | awk '{print $6, $7, $8}'
  echo ""
else
  echo "❌ No log file found. Update may not have run yet."
  echo ""
fi

# Check for recent errors
if [ -f "$LOG_DIR/daily-update-stderr.log" ] && [ -s "$LOG_DIR/daily-update-stderr.log" ]; then
  echo "⚠️  Recent errors detected:"
  echo "-------------------------"
  tail -n 10 "$LOG_DIR/daily-update-stderr.log"
  echo ""
fi

echo "✅ Monitoring script complete"
EOF

chmod +x "$MONITOR_SCRIPT"
echo "✅ Monitoring script created: $MONITOR_SCRIPT"
echo ""

# Final instructions
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Daily updates will run automatically at midnight"
echo ""
echo "📝 Logs location: $LOG_DIR"
echo ""
echo "🔍 To check update status:"
echo "   $MONITOR_SCRIPT"
echo ""
echo "🧪 To test the update now (dry run):"
echo "   npm run daily:update:dry-run"
echo ""
echo "▶️  To run update now (live):"
echo "   npm run daily:update"
echo ""
