#!/bin/bash

# Script to set admin role using the createFirstAdmin HTTP function
# This uses the already deployed Cloud Function

echo "Setting admin role for the first user..."
echo "======================================="

# Set the admin email in Firebase config
firebase functions:config:set admin.email="michael@cengkuru.com"

echo ""
echo "Config set. Now calling the createFirstAdmin function..."
echo ""

# Call the HTTP function
curl https://createfirstadmin-dayanhktcq-uc.a.run.app

echo ""
echo ""
echo "✅ Done! Please sign out and sign back in for the admin privileges to take effect."