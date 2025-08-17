FROM node:18-alpine

# Set working directory
WORKDIR /workspace

# Copy package files for better Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production=false

# Optionally install tsx globally for consistent availability
RUN npm install --location=global tsx

# Copy the rest of the application
COPY . .

# Ensure the runner script exists (create directory structure)
RUN mkdir -p src/runner

# Default command (can be overridden)
CMD ["tsx", "src/runner/claude-runner.ts"]