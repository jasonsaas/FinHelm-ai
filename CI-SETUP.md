# CI Setup for Claude Runner

## Problem
The CI step was failing with error: "tsx command not found" when trying to execute:
```bash
docker exec -i … sh -c 'cd /workspace && tsx /workspace/src/runner/claude-runner.ts'
```

## Solution
Use `npx tsx` instead of direct `tsx` command:

### Updated CI Command
```bash
docker exec -i $CONTAINER_ID sh -c "cd /workspace && npx tsx src/runner/claude-runner.ts"
```

### Why This Works
1. **npx**: Uses the locally installed tsx from `node_modules/.bin`
2. **More Reliable**: Doesn't rely on global PATH configuration
3. **Version Control**: Uses the exact tsx version specified in package.json (^4.7.0)

### Alternative Approach
If you prefer global installation, the Dockerfile now includes:
```dockerfile
RUN npm install --location=global tsx
```
This makes tsx available globally in the container.

### Files Updated
- ✅ `/workspace/package.json` - Already had tsx in devDependencies
- ✅ `/workspace/Dockerfile` - Added global tsx installation  
- ✅ CI command - Should use `npx tsx` instead of `tsx`

### Testing
To test the setup:
```bash
# Build the Docker image
docker build -t claude-runner .

# Run container
docker run -d --name claude-runner claude-runner

# Test tsx availability
docker exec -i claude-runner which tsx
docker exec -i claude-runner tsx --version

# Test the runner script
docker exec -i claude-runner sh -c "cd /workspace && npx tsx src/runner/claude-runner.ts"
```