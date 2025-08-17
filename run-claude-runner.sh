#!/bin/bash

# Claude Runner CI Script
# This script demonstrates the correct way to run the TypeScript claude-runner.ts file
# in a Docker container environment.

# Use npx tsx instead of direct tsx command for better reliability
# This ensures we use the locally installed tsx from node_modules/.bin
docker exec -i $CONTAINER_ID sh -c "cd /workspace && npx tsx src/runner/claude-runner.ts"

# Alternative: If tsx is installed globally in the Docker container, you can also use:
# docker exec -i $CONTAINER_ID sh -c "cd /workspace && tsx src/runner/claude-runner.ts"