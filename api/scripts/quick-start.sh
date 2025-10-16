#!/bin/bash
###############################################################################
# Quick Start Script - Full-Scale Knowledge Base
#
# Sets up and runs the full-scale seeding process with all optimizations
###############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CoST Knowledge Hub - Quick Start                          ║${NC}"
echo -e "${BLUE}║  Full-Scale Setup (7 → 50+ resources)                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Database Indexes
echo -e "${GREEN}Step 1/3: Creating database indexes (prevents duplicates)...${NC}"
npm run db:indexes

echo ""

# Step 2: Full-Scale Seed
echo -e "${GREEN}Step 2/3: Running full-scale seed (50+ resources)...${NC}"
echo -e "${YELLOW}This will take 5-10 minutes and cost ~\$0.03-0.05${NC}"
echo ""
npm run seed:full

echo ""

# Step 3: Quality Check
echo -e "${GREEN}Step 3/3: Running quality assurance check...${NC}"
npm run qa:check

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Quick Start Complete!                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Review cost: npm run cost:today"
echo "  2. Set up daily updates: See SCALING_GUIDE.md"
echo "  3. Monitor quality: npm run qa:check"
echo ""
echo -e "${GREEN}Resources:${NC}"
echo "  - Scaling Guide: api/SCALING_GUIDE.md"
echo "  - Summary: api/IMPLEMENTATION_SUMMARY.md"
echo ""
