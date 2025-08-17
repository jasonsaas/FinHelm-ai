# tsx Binary Fix for CI/CD

This repository contains a complete solution for the `tsx binary not found` error in CI/CD pipelines.

## Problem Solved

The CI step `docker exec -i … sh -c 'cd /workspace && tsx /workspace/src/runner/claude-runner.ts'` was failing because the `tsx` binary wasn't available in the container.

## Solution Overview

### 1. **Root Cause**: Missing tsx dependency
- Docker container didn't have `tsx` installed
- TypeScript execution runtime was not available

### 2. **Fix Applied**: Complete tsx setup
- ✅ Added `tsx` as devDependency in `package.json`
- ✅ Created proper `Dockerfile` with Node.js setup
- ✅ Updated CI commands to use `npx tsx` (recommended)
- ✅ Created TypeScript runner file
- ✅ Added comprehensive testing and documentation

## Files Created/Modified

```
├── package.json              # Added tsx devDependency
├── Dockerfile               # Node.js 18 Alpine with tsx setup
├── src/runner/claude-runner.ts    # TypeScript runner script
├── .github/workflows/ci.yml  # CI workflow with npx tsx
├── test-ci-fix.sh           # Comprehensive test script
├── CI-FIX-GUIDE.md         # Detailed fix documentation
└── README-tsx-fix.md       # This overview file
```

## Quick Start

### For Local Development
```bash
npm install           # Install tsx dependency
npx tsx src/runner/claude-runner.ts   # Run the TypeScript script
```

### For Docker
```bash
docker build -t erpinsight-ai .
docker run --rm erpinsight-ai npx tsx src/runner/claude-runner.ts
```

### For CI/CD (Fixed Commands)

**Old (failing) command:**
```bash
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && tsx /workspace/src/runner/claude-runner.ts'
```

**New (working) commands:**
```bash
# Option 1: Use npx (RECOMMENDED)
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && npx tsx src/runner/claude-runner.ts'

# Option 2: Use global tsx (if installed in Dockerfile)
docker exec -i $CONTAINER_ID sh -c 'cd /workspace && tsx src/runner/claude-runner.ts'
```

## Testing the Fix

Run the comprehensive test script:
```bash
./test-ci-fix.sh
```

This validates:
- ✅ tsx is in package.json devDependencies
- ✅ Dockerfile configuration
- ✅ TypeScript runner script
- ✅ CI workflow setup
- ✅ npx tsx command functionality

## Why npx tsx is Recommended

1. **Reliability**: Uses locally installed version from `node_modules/.bin/tsx`
2. **Consistency**: Works across different environments
3. **Best Practice**: Follows Node.js package management conventions
4. **Fallback**: Works even if global installation fails

## Prevention Tips

- Always install CLI tools as project dependencies
- Use `npx` for local binaries instead of global PATH
- Test Docker builds locally before CI deployment
- Keep `package.json` and `Dockerfile` in sync
- Add dependency validation to pre-commit hooks

## Technical Details

- **Base Image**: Node.js 18 Alpine (lightweight, secure)
- **tsx Version**: ^4.4.0 (latest stable)
- **Working Directory**: `/workspace`
- **Installation**: Both local (`npm ci`) and global (`npm install -g tsx`)

---

## Need Help?

Check the detailed documentation:
- `CI-FIX-GUIDE.md` - Step-by-step fix guide
- `.github/workflows/ci.yml` - Example CI workflow
- `test-ci-fix.sh` - Validation script