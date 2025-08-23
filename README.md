# FinHelm AI

AI-powered financial management and analysis platform built with modern web technologies.

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Shared**: Common types, utilities, and constants

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
