# CI tsx Command Fix Guide

## Problem
The CI step `docker exec -i … sh -c 'cd /workspace && tsx /workspace/src/runner/claude-runner.ts'` was failing because the `tsx` binary wasn't available in the container.

## Root Cause
The Docker image/container didn't have `tsx` installed either as a project dependency or globally.

## Solution Applied

### 1. Added tsx as Project Dependency
Updated `package.json` to include:
```json
{
  "devDependencies": {
    "tsx": "^4.4.0"
  }
}
```

### 2. Updated Dockerfile
Created `Dockerfile` with proper setup:
- Node.js 18 Alpine base image
- Runs `npm ci` to install dependencies
- Installs tsx globally: `RUN npm install --location=global tsx`
- Sets working directory to `/workspace`

### 3. Fixed CI Command

**Old (failing) command:**
```bash
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && tsx /workspace/src/runner/claude-runner.ts'
```

**New (working) commands:**
```bash
# Option 1: Use npx to run local tsx (RECOMMENDED)
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && npx tsx src/runner/claude-runner.ts'

# Option 2: Use globally installed tsx
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && tsx src/runner/claude-runner.ts'
```

### 4. Why npx is Recommended
- Uses locally installed version from `node_modules/.bin/tsx`
- More reliable and consistent across environments
- Works even if global installation fails
- Follows Node.js best practices

## Testing the Fix

Build and test the Docker image:
```bash
# Build image
docker build -t erpinsight-ai .

# Test tsx availability
docker run --rm erpinsight-ai which tsx
docker run --rm erpinsight-ai npx tsx --version

# Test the runner script
docker run --rm erpinsight-ai npx tsx src/runner/claude-runner.ts
```

## Prevention Tips
- Always install CLI tools as project dependencies
- Use `npx` for local binaries instead of relying on global PATH
- Test Docker builds locally before CI deployment
- Keep `package.json` and `Dockerfile` in sync