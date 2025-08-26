# Environment Update Script (env-update.ts)

A comprehensive Node.js/TypeScript script for FinHelm.ai that automates Convex deployment URL configuration and git operations.

## Features

- 🔗 **Interactive URL Input**: Prompts for Convex deployment URL with validation
- 📄 **Smart .env Management**: Creates or updates `.env` file while preserving existing variables
- 🔍 **Git Integration**: Automatically stages, commits, and pushes environment changes
- ⚠️ **Error Handling**: Gracefully handles gitignored files and permission issues
- 🎨 **Colored Output**: User-friendly console output with status indicators
- 🛡️ **Safe Operations**: Validates URLs and handles interrupts gracefully

## Usage

### Prerequisites

- Node.js 18+ with TypeScript support
- Git repository initialized
- Convex deployment URL from `npx convex dev`

### Running the Script

```bash
# Make sure you're in the project root directory
cd /path/to/FinHelm-ai

# Execute the script
npx ts-node env-update.ts
```

### Interactive Process

1. **URL Input**: Script prompts for your Convex deployment URL
   ```
   > Convex Deployment URL: https://happy-animal-123.convex.cloud
   ```

2. **Environment Update**: Updates or creates `.env` file with proper formatting

3. **Git Operations**: 
   - Checks git status
   - Stages relevant files (skips gitignored ones)
   - Commits with message: "Add Convex deployment URL post-auth"
   - Pushes to origin main

## Script Behavior

### File Handling

- **Creates `.env`** if it doesn't exist
- **Preserves existing** environment variables
- **Adds header comments** with timestamp
- **Organizes sections** (Convex, Other Config)

### Git Operations

- **Checks git status** for related files
- **Respects `.gitignore`** (won't stage ignored files)
- **Stages only relevant files**: `.env`, `.env.example`, `package.json`, `convex.json`
- **Safe commit/push** with error handling

### Error Handling

- **URL validation** (basic format checking)
- **File permission** error handling
- **Git operation** failure recovery
- **Graceful interruption** handling (Ctrl+C)

## Example Output

```
🚀 FinHelm.ai Environment Update Script
=====================================

📍 Step 1: Get Convex deployment URL
🔗 Convex Deployment URL Setup
Please enter your Convex deployment URL from `npx convex dev`:
Example: https://happy-animal-123.convex.cloud

> Convex Deployment URL: https://wise-dog-456.convex.cloud
✅ Received Convex URL: https://wise-dog-456.convex.cloud

📍 Step 2: Parse existing environment configuration
📄 No existing .env file found at /path/to/.env

📍 Step 3: Update environment variables
📝 Creating new .env file
✅ Successfully updated /path/to/.env

📍 Step 4: Handle git operations
📋 Checking git status...
📄 .env is not gitignored, will be staged for commit
📝 Found changes in: .env
✅ Staged .env
✅ Committed changes: "Add Convex deployment URL post-auth"
🚀 Pushing to origin main...
✅ Successfully pushed to origin main

🎉 Environment update completed successfully!

📋 Summary:
   • Convex URL: https://wise-dog-456.convex.cloud
   • Environment file: /path/to/.env
   • Git operations: Completed

🚀 Next steps:
   1. Verify your .env file contains the correct URL
   2. Test your Convex functions with: npx convex dev
   3. Run your application to ensure everything works
```

## Generated .env Format

The script creates a well-structured `.env` file:

```bash
# FinHelm.ai Environment Configuration
# Generated and updated by env-update.ts
# Last updated: 2024-08-24T16:45:30.123Z

# ======================================
# Convex Configuration
# ======================================
CONVEX_DEPLOYMENT=https://wise-dog-456.convex.cloud

# ======================================
# Other Configuration
# ======================================
NODE_ENV=development
PORT=3000
# ... other existing variables
```

## Troubleshooting

### Common Issues

1. **"Not in a git repository"**
   - Initialize git: `git init`
   - Add remote: `git remote add origin <url>`

2. **"Permission denied"**
   - Check file permissions
   - Ensure you can write to the project directory

3. **"Invalid URL format"**
   - Use the full Convex deployment URL
   - Example: `https://happy-animal-123.convex.cloud`

4. **Git push fails**
   - Check git credentials
   - Ensure you have push permissions to the repository

### Script Location

The script should be run from the **project root directory** where:
- `package.json` exists
- `convex.json` exists
- `.env.example` exists (optional)

## Development Notes

- **TypeScript**: Fully typed for better development experience
- **Modular Design**: Separate functions for different operations
- **Error Recovery**: Continues operation even if some steps fail
- **User Experience**: Colored output and clear progress indicators

## Integration

This script integrates seamlessly with the FinHelm.ai development workflow:

1. Run `npx convex dev` to get your deployment URL
2. Run `npx ts-node env-update.ts` to configure environment
3. Your application is ready to use Convex functions

## Security Notes

- ⚠️ **Never commit** the actual `.env` file to version control
- ✅ **Always use** `.env.example` for sharing configuration templates
- 🔒 **Keep deployment URLs** secure and environment-specific