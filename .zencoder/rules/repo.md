---
description: Repository Information Overview
alwaysApply: true
---

# FinHelm.ai Repository Information

## Repository Summary
FinHelm.ai is an AI-powered ERP co-pilot for SMBs connecting to QuickBooks and Sage Intacct. It transforms ERP data into actionable CFO-level insights, forecasts, and automations using advanced AI agents and intelligent data reconciliation.

## Repository Structure
- **src/**: Main application entry point
- **convex/**: Convex backend functions for database operations
- **backend/**: Additional backend services with Express API
- **frontend/**: React-based user interface
- **shared/**: Common types and utilities shared across projects
- **documentation/**: Project documentation and guidelines
- **scripts/**: Setup and utility scripts

### Main Repository Components
- **Convex Backend**: Core database and business logic using Convex reactive database
- **Express API**: Additional backend services for external integrations
- **React Frontend**: User interface built with React, Vite, and TailwindCSS
- **Shared Library**: Common types and utilities for cross-project use

## Projects

### Root Project
**Configuration File**: package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9+
**Runtime**: Node.js 18+
**Build System**: npm
**Package Manager**: npm 8.0.0+

#### Dependencies
**Main Dependencies**:
- dotenv: ^17.2.1
- convex: ^1.26.1

**Development Dependencies**:
- typescript: ^5.9.2
- ts-node: ^10.9.2
- concurrently: ^8.2.2
- @types/node: ^20.19.11

#### Build & Installation
```bash
npm install
npm run build
```

### Frontend (React Application)
**Configuration File**: frontend/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9+
**Runtime**: Node.js 18+
**Build System**: Vite
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- react: ^18.2.0
- react-dom: ^18.2.0
- react-router-dom: ^6.20.0
- @tanstack/react-query: ^5.0.0
- axios: ^1.6.0
- recharts: ^2.8.0
- tailwind-merge: ^2.0.0

**Development Dependencies**:
- vite: ^5.0.0
- tailwindcss: ^3.3.6
- jest: ^29.7.0
- @testing-library/react: ^13.4.0

#### Build & Installation
```bash
cd frontend
npm install
npm run build
```

#### Testing
**Framework**: Jest with React Testing Library
**Test Location**: Not specified in repository
**Run Command**:
```bash
npm test
```

### Backend (Express API)
**Configuration File**: backend/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9+
**Runtime**: Node.js 18+
**Build System**: TypeScript
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- express: ^4.18.2
- convex: ^1.26.1
- cors: ^2.8.5
- dotenv: ^16.3.1
- helmet: ^7.0.0
- jsonwebtoken: ^9.0.2
- mongoose: ^8.0.0
- zod: ^3.22.4

**Development Dependencies**:
- tsx: ^4.0.0
- jest: ^29.7.0
- ts-jest: ^29.1.1

#### Build & Installation
```bash
cd backend
npm install
npm run build
```

#### Testing
**Framework**: Jest
**Test Location**: Not specified in repository
**Run Command**:
```bash
npm test
```

### Shared Library
**Configuration File**: shared/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9+
**Runtime**: Node.js 18+
**Build System**: TypeScript
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- zod: ^3.22.4

**Development Dependencies**:
- jest: ^29.7.0
- ts-jest: ^29.1.1

#### Build & Installation
```bash
cd shared
npm install
npm run build
```

### Convex Backend
**Configuration File**: convex.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9+
**Runtime**: Node.js 18+
**Build System**: Convex
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- convex: ^1.26.1

#### Build & Installation
```bash
npx convex dev
npx convex deploy
```

## Development & Operations

### Environment Setup
The project uses environment variables for configuration:
- Copy `.env.example` to `.env` in root directory
- Configure Convex deployment URL and API keys
- Set up ERP integration keys when implementing integrations

### Development Workflow
```bash
# Start development server
npm run dev

# Start all workspace development servers
npm run dev:workspaces

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment
```bash
# Deploy Convex functions
npx convex deploy

# Test deployment
node deploy-test-simple.js
```