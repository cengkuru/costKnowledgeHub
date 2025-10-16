#!/bin/bash
# Integration Test - Web Frontend → API Backend → MongoDB Vector Search
# Tests the full stack end-to-end

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Full Stack Integration Test                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check API server
echo -e "${BLUE}1️⃣  Testing API server (localhost:3000)${NC}"
API_HEALTH=$(curl -s http://localhost:3000/health || echo "FAILED")
if [[ $API_HEALTH == *"ok"* ]]; then
  echo -e "${GREEN}✅ API server is healthy${NC}"
else
  echo -e "${RED}❌ API server is down${NC}"
  exit 1
fi
echo ""

# 2. Check web server
echo -e "${BLUE}2️⃣  Testing web server (localhost:4200)${NC}"
WEB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 || echo "000")
if [[ $WEB_CHECK == "200" ]]; then
  echo -e "${GREEN}✅ Web server is running${NC}"
else
  echo -e "${RED}❌ Web server is down (HTTP $WEB_CHECK)${NC}"
  exit 1
fi
echo ""

# 3. Test API proxy (web → api)
echo -e "${BLUE}3️⃣  Testing web proxy (localhost:4200/api → localhost:3000)${NC}"
PROXY_TEST=$(curl -s http://localhost:4200/api/health || echo "FAILED")
if [[ $PROXY_TEST == *"ok"* ]]; then
  echo -e "${GREEN}✅ Proxy is working correctly${NC}"
else
  echo -e "${RED}❌ Proxy is not configured properly${NC}"
  exit 1
fi
echo ""

# 4. Test vector search
echo -e "${BLUE}4️⃣  Testing vector search (full pipeline)${NC}"
SEARCH_RESULT=$(curl -s "http://localhost:3000/search?q=OC4IDS")
ANSWER_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"answer":\[' | wc -l)
ITEMS_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"items":\[' | wc -l)

if [[ $ANSWER_COUNT -gt 0 && $ITEMS_COUNT -gt 0 ]]; then
  echo -e "${GREEN}✅ Vector search returning results${NC}"

  # Extract details
  NUM_BULLETS=$(echo "$SEARCH_RESULT" | grep -o '"text":' | wc -l)
  NUM_ITEMS=$(echo "$SEARCH_RESULT" | grep -o '"id":' | wc -l)
  echo "   📊 Answer bullets: $NUM_BULLETS"
  echo "   📄 Search results: $NUM_ITEMS"
else
  echo -e "${RED}❌ Vector search not returning data${NC}"
  echo "Response: $SEARCH_RESULT"
  exit 1
fi
echo ""

# 5. Test answer synthesis
echo -e "${BLUE}5️⃣  Testing AI answer synthesis with citations${NC}"
if [[ $(echo "$SEARCH_RESULT" | grep -c '"cites":') -gt 0 ]]; then
  echo -e "${GREEN}✅ Citations present in answer${NC}"
  NUM_CITATIONS=$(echo "$SEARCH_RESULT" | grep -o '"cites":' | wc -l)
  echo "   🔗 Total citation blocks: $NUM_CITATIONS"
else
  echo -e "${RED}❌ No citations found${NC}"
  exit 1
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ All Integration Tests Passed                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Full stack is operational:"
echo "   • Web UI: http://localhost:4200"
echo "   • API Backend: http://localhost:3000"
echo "   • MongoDB Atlas: Connected with vector search"
echo "   • AI Synthesis: Gemini Flash with citations"
echo ""
