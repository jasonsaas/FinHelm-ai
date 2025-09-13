#!/bin/bash

echo "Testing Convex Webhook URLs"
echo "============================"
echo ""

# Test URLs - note the difference between .convex.site and .convex.cloud
SITE_URL="https://ardent-dog-632.convex.site"
CLOUD_URL="https://ardent-dog-632.convex.cloud"

echo "Testing .convex.site domain (correct for HTTP routes):"
echo "-------------------------------------------------------"

# Test the test endpoint first
echo ""
echo "1. Testing GET /test endpoint:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" "${SITE_URL}/test"

echo ""
echo "2. Testing POST /test endpoint:"
curl -X POST "${SITE_URL}/test" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -s -w "\n   Status: %{http_code}\n"

echo ""
echo "3. Testing GET /webhook/n8n (should return 405):"
curl -s "${SITE_URL}/webhook/n8n" | jq '.' 2>/dev/null || curl -s "${SITE_URL}/webhook/n8n"

echo ""
echo "4. Testing POST /webhook/n8n with sample data:"
curl -X POST "${SITE_URL}/webhook/n8n" \
  -H "Content-Type: application/json" \
  -d '{
    "dataType": "customers",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "data": [
      {
        "Id": "TEST001",
        "DisplayName": "Test Customer",
        "Active": true,
        "Balance": "100.00"
      }
    ],
    "summary": {
      "totalRecords": 1,
      "processed": 0,
      "failed": 0
    }
  }' \
  -s | jq '.' 2>/dev/null

echo ""
echo "============================"
echo "The correct webhook URL is:"
echo "${SITE_URL}/webhook/n8n"
echo ""
echo "Use .convex.site (not .convex.cloud) for HTTP routes!"