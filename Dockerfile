# Use Node.js LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /workspace

# Copy package files for better Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies (including tsx from devDependencies)
RUN npm ci

# Install tsx globally for consistent availability
RUN npm install --location=global tsx

# Copy TypeScript configuration if it exists
COPY tsconfig.json* ./

# Copy the rest of the application
COPY . .

# Ensure the runner script directory structure exists
RUN mkdir -p src/runner

# Build the TypeScript application if build script exists
RUN npm run build 2>/dev/null || true

# Default command - can run tsx directly or use npx
CMD ["tsx", "src/runner/claude-runner.ts"]
