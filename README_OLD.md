# FinHelm.ai Backend Foundation

[![Backend Status](https://img.shields.io/badge/Backend-Ready%20for%20Deployment-brightgreen)](https://github.com/jasonsaas/FinHelm-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-1.26+-purple)](https://convex.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

AI-powered ERP co-pilot for SMBs connecting to QuickBooks and Sage Intacct. FinHelm.ai transforms ERP data into actionable CFO-level insights, forecasts, and automations using advanced AI agents and intelligent data reconciliation.

## 🚀 Project Overview

FinHelm.ai is a conversational AI co-pilot designed for small-to-medium businesses using QuickBooks or Sage Intacct. It provides:

- **Multi-ERP Support**: Seamless integration with QuickBooks, Sage Intacct, and extensible to other ERPs
- **AI-Powered Insights**: 25+ pre-built AI agents for financial analysis, forecasting, and automation
- **Intelligent Data Reconciliation**: Oracle Document IO-inspired fuzzy matching for ERP data normalization
- **Hierarchical Account Management**: Complex chart of accounts with nested structures
- **Real-time Analytics**: Reactive database with live financial insights
- **Explainable AI**: Grok-powered reasoning with transparent decision-making

## 🏗 Architecture

### Backend Foundation (Day 2 Implementation)

## 🚀 Quick Start

1. **Setup the development environment:**
   ```bash
   ./scripts/setup.sh
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

3. **Access the applications:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
FinHelm-ai/
├── backend/                # Express.js API server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── tests/             # Backend tests
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Frontend utilities
│   └── tests/             # Frontend tests
├── shared/                # Shared code between frontend/backend
│   ├── src/
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Shared utilities
│   │   └── constants/     # Shared constants
│   └── tests/             # Shared code tests
└── scripts/               # Development scripts
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm 8+

### Environment Setup

1. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Update `backend/.env` with your configuration:
   - MongoDB connection string
   - JWT secret
   - API keys for external services

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Building
npm run build           # Build all packages
npm run type-check      # Type check all packages

# Testing
npm run test            # Run all tests
npm run lint            # Lint all packages
```

## 🔧 Configuration

### Backend Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finhelm-ai
JWT_SECRET=your-secret-key
```

### Frontend Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=FinHelm AI
```

## 🎯 Features (Planned)

- [ ] User authentication and authorization
- [ ] Account management (checking, savings, credit, investment)
- [ ] Transaction tracking and categorization
- [ ] AI-powered financial insights
- [ ] Budgeting and goal setting
- [ ] Expense analysis and reporting
- [ ] Bank account integration (Plaid)
- [ ] Investment tracking
- [ ] Bill reminders and notifications

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation with Zod
- SQL injection prevention
- XSS protection

## 📊 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Zod** - Validation

## 📝 License

This project was created on 8/23/25.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
