# FinHelm.ai Setup Guide

This guide will help you set up the complete FinHelm.ai ecosystem with both the FastAPI backend and the modern React frontend.

## 🏗️ Project Structure

```
FinHelm.ai/
├── backend/                 # FastAPI backend with QuickBooks auth
├── frontend/               # Legacy React frontend
├── finhelm-ai-navigator/   # Modern React frontend (recommended)
└── FinHelm.ai.code-workspace  # Cursor/VS Code workspace file
```

## 🚀 Quick Start

### Option 1: Using Cursor Workspace (Recommended)

1. **Open the workspace in Cursor:**
   ```bash
   # Open Cursor and go to File > Open Workspace from File
   # Select: FinHelm.ai.code-workspace
   ```

2. **Install dependencies:**
   - Press `Cmd+Shift+P` and run "Tasks: Run Task"
   - Select "Install Backend Dependencies"
   - Then select "Install Frontend Dependencies"

3. **Start both servers:**
   - Press `Cmd+Shift+P` and run "Tasks: Run Task"
   - Select "Start Both Servers"

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend
pip3 install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

#### Frontend Setup
```bash
cd finhelm-ai-navigator
npm install
npm run dev
```

## 🌐 Access Points

Once both servers are running:

- **Backend API:** http://localhost:8000
- **Backend Docs:** http://localhost:8000/docs
- **Frontend (Modern):** http://localhost:5173
- **Frontend (Legacy):** http://localhost:3000 (if running)

## 🔧 Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=sqlite:///./finhelm.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# QuickBooks OAuth
QBO_CLIENT_ID=your-quickbooks-client-id
QBO_CLIENT_SECRET=your-quickbooks-client-secret
QBO_REDIRECT_URI=http://localhost:8000/auth/quickbooks/callback
QBO_SCOPE=com.intuit.quickbooks.accounting
QBO_API_BASE=https://sandbox-accounts.platform.intuit.com
QBO_DISCOVERY_DOCUMENT=https://developer.api.intuit.com/.well-known/openid_sandbox_configuration

# Grok AI
GROK_API_KEY=your-grok-api-key
GROK_API_URL=https://api.x.ai/v1

# App Settings
APP_NAME=FinHelm.ai
DEBUG=true
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Frontend Configuration

Create a `.env.local` file in the `finhelm-ai-navigator/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=FinHelm.ai
VITE_APP_VERSION=2.0.0
```

## 🔗 API Integration

The frontend is now configured to communicate with your FastAPI backend through:

### QuickBooks Integration
```typescript
import { useQuickBooks } from '../hooks/useQuickBooks';

const { connect, checkStatus, disconnect } = useQuickBooks();

// Connect to QuickBooks
const authUrl = await connect();
if (authUrl) {
  window.location.href = authUrl;
}

// Check connection status
await checkStatus();

// Disconnect
await disconnect();
```

### AI Financial Queries
```typescript
import { useFinancialQuery } from '../hooks/useFinancialQuery';

const { askQuestion, generateForecast } = useFinancialQuery();

// Ask a financial question
const response = await askQuestion("What's my cash flow for this month?");

// Generate a forecast
const forecast = await generateForecast("revenue", 12);
```

## 🎯 Development Workflow

### Using Cursor Workspace

1. **Switch between projects:**
   - Use the workspace switcher in the sidebar
   - Or use `Cmd+P` to search files across both projects

2. **Run tasks:**
   - `Cmd+Shift+P` → "Tasks: Run Task"
   - Available tasks:
     - Start Backend
     - Start Frontend (Modern)
     - Start Both Servers
     - Install Dependencies

3. **Debug:**
   - Use the Debug panel to debug both backend and frontend
   - Set breakpoints in Python and TypeScript files

### File Organization

- **Backend code:** `backend/` directory
- **Frontend code:** `finhelm-ai-navigator/src/` directory
- **API integration:** `finhelm-ai-navigator/src/lib/api.ts`
- **Custom hooks:** `finhelm-ai-navigator/src/hooks/`

## 🔍 Testing the Integration

### 1. Test Backend Health
```bash
curl http://localhost:8000/health
```

### 2. Test QuickBooks OAuth Flow
1. Open http://localhost:5173
2. Click "Connect QuickBooks"
3. Complete the OAuth flow
4. Check connection status

### 3. Test AI Chat
1. Ensure QuickBooks is connected
2. Ask a financial question
3. Verify AI response

## 🐛 Troubleshooting

### Backend Issues
- **Port already in use:** Change port in uvicorn command
- **Import errors:** Check Python path and dependencies
- **Database errors:** Ensure SQLite file is writable

### Frontend Issues
- **API connection failed:** Check backend is running on port 8000
- **Build errors:** Clear node_modules and reinstall
- **TypeScript errors:** Check type definitions

### QuickBooks Issues
- **OAuth errors:** Verify client ID and redirect URI
- **Token refresh failed:** Re-authenticate with QuickBooks
- **API rate limits:** Implement proper error handling

## 📚 Next Steps

1. **Set up QuickBooks Developer Account:**
   - Create app at https://developer.intuit.com/
   - Configure OAuth settings
   - Update environment variables

2. **Configure Grok AI:**
   - Get API key from xAI
   - Update backend configuration

3. **Deploy:**
   - Backend: Deploy to Vercel, Railway, or similar
   - Frontend: Deploy to Vercel, Netlify, or similar
   - Update environment variables for production

4. **Customize:**
   - Modify UI components in `finhelm-ai-navigator/src/components/`
   - Add new API endpoints in `backend/main.py`
   - Extend AI capabilities in `backend/app/agents/`

## 🆘 Support

- **Backend API Docs:** http://localhost:8000/docs
- **Frontend Code:** Modern React/TypeScript with Vite
- **Integration Guide:** See `backend/QUICKBOOKS_AUTH_API.md`

---

**FinHelm.ai** - Steer Your Finances with AI Precision
