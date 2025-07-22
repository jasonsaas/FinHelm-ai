# 🚀 QuickCauz.ai Setup Guide

**AI-Powered Financial Insights for QuickBooks Online**  
*Powered by xAI Grok + QuickBooks Online REST API*

---

## 📋 **Prerequisites**

### **Required Accounts & API Keys:**
1. **🏢 Intuit Developer Account** (Free)
   - Sign up: https://developer.intuit.com/
   - Create QuickBooks Online app for OAuth credentials

2. **🤖 xAI API Access** 
   - Request access: https://x.ai/api
   - Get your Grok API key for AI-powered analysis

3. **💻 Development Environment**
   - Python 3.9+
   - Node.js 16+
   - Git

---

## 🔑 **Step 1: Get QuickBooks OAuth Credentials**

### **Create Intuit Developer App:**

1. **Go to Intuit Developer Console:**
   ```
   https://developer.intuit.com/app/developer/myapps
   ```

2. **Create New App:**
   - Click "Create an app"
   - Select "QuickBooks Online and Payments"
   - App name: "QuickCauz.ai"
   - Description: "AI-powered financial insights"

3. **Configure OAuth Settings:**
   - **Redirect URIs:** 
     ```
     http://localhost:3000/auth/quickbooks/callback
     ```
   - **Scope:** `com.intuit.quickbooks.accounting`

4. **Get Your Credentials:**
   - **Client ID** → Use as `QBO_CLIENT_ID`
   - **Client Secret** → Use as `QBO_CLIENT_SECRET`

### **Set up Sandbox Company:**

1. **Create Sandbox Company:**
   ```
   https://developer.intuit.com/app/developer/sandbox
   ```

2. **Sample Company Data:**
   - Choose "Sample Company" for testing
   - This gives you realistic financial data

---

## 🤖 **Step 2: Get xAI Grok API Access**

### **Request API Access:**

1. **Visit xAI API Portal:**
   ```
   https://x.ai/api
   ```

2. **Request Access:**
   - Fill out the application form
   - Mention you're building financial analysis tools
   - Wait for approval (usually 1-7 days)

3. **Get API Key:**
   - Once approved, get your API key
   - Use as `GROK_API_KEY`

---

## 🛠 **Step 3: Project Setup**

### **Clone/Create Project:**

```bash
# Create project directory
mkdir quickcauz-ai
cd quickcauz-ai

# Copy the generated code files to this directory
# (backend/ and frontend/ folders)
```

### **Backend Setup:**

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

### **Configure Backend Environment (.env):**

```env
# QuickBooks Online OAuth 2.0
QBO_CLIENT_ID=your_actual_client_id_from_intuit
QBO_CLIENT_SECRET=your_actual_client_secret_from_intuit
QBO_ENVIRONMENT=sandbox
QBO_REDIRECT_URI=http://localhost:3000/auth/quickbooks/callback
QBO_SCOPE=com.intuit.quickbooks.accounting
QBO_API_BASE=https://sandbox-quickbooks.api.intuit.com

# xAI Grok Configuration
GROK_API_KEY=your_actual_grok_api_key
GROK_API_BASE=https://api.x.ai/v1
GROK_MODEL=grok-beta
GROK_MAX_TOKENS=2000
GROK_TEMPERATURE=0.7

# Security (IMPORTANT: Change in production!)
SECRET_KEY=your_super_secret_key_minimum_32_characters_long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database
DATABASE_URL=sqlite:///./quickcauz.db

# Application
APP_NAME=QuickCauz.ai
DEBUG=True
LOG_LEVEL=INFO
```

### **Frontend Setup:**

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:8000" > .env
```

---

## 🚀 **Step 4: Run the Application**

### **Start Backend (Terminal 1):**

```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
python main.py
```

**Expected output:**
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Starting QuickCauz.ai backend...
INFO:     Database tables created/verified
INFO:     Grok API status: healthy
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### **Start Frontend (Terminal 2):**

```bash
cd frontend
npm start
```

**Expected output:**
```
Compiled successfully!

Local:            http://localhost:3000
On Your Network:  http://192.168.x.x:3000
```

---

## 🧪 **Step 5: Test the Application**

### **1. User Registration:**
1. Go to: http://localhost:3000
2. Click "Sign up"
3. Create account with email/username/password

### **2. QuickBooks Connection:**
1. After login, click "Connect with QuickBooks Online"
2. You'll be redirected to Intuit's OAuth page
3. Log in with your sandbox credentials
4. Authorize QuickCauz.ai access
5. You'll be redirected back with success message

### **3. Test AI Queries:**

Try these sample queries:
```
"Show me my revenue accounts"
"What's my current financial position?"
"Analyze my top expenses"
"Generate a revenue forecast for next 6 months"
"What trends do you see in my data?"
"How is my cash flow looking?"
```

---

## 🔍 **Troubleshooting**

### **Common Issues:**

**❌ QuickBooks OAuth Error:**
```
"Invalid redirect URI"
```
**✅ Solution:**
- Verify redirect URI exactly matches: `http://localhost:3000/auth/quickbooks/callback`
- Check if app is in Development mode in Intuit console

**❌ Grok API Error:**
```
"Unauthorized" or "API key invalid"
```
**✅ Solution:**
- Verify your Grok API key is correct
- Ensure you have API access approved
- Check if you've exceeded rate limits

**❌ Backend Error:**
```
"Missing required environment variables"
```
**✅ Solution:**
- Ensure all required .env variables are set
- Restart backend after changing .env

**❌ Frontend Connection Error:**
```
"Network Error" when connecting QB
```
**✅ Solution:**
- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify frontend .env has correct API URL

### **API Health Checks:**

```bash
# Test backend health
curl http://localhost:8000/health

# Test Grok API connection
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/health
```

---

## 📊 **Step 6: Testing with Sample Data**

### **QuickBooks Sandbox Data:**

The sandbox comes with sample data including:
- **Accounts:** Assets, Liabilities, Income, Expenses
- **Invoices:** Sample customer invoices
- **Items:** Products and services
- **Reports:** P&L, Balance Sheet data

### **Sample AI Queries to Test:**

1. **Account Analysis:**
   ```
   "Show me all my accounts and their balances"
   "What are my biggest expense categories?"
   ```

2. **Revenue Analysis:**
   ```
   "Analyze my revenue trends over the last year"
   "Which customers generate the most revenue?"
   ```

3. **Forecasting:**
   ```
   "Forecast my revenue for the next 12 months"
   "What should I expect for cash flow next quarter?"
   ```

4. **Business Insights:**
   ```
   "What are the key insights about my business performance?"
   "Give me recommendations to improve profitability"
   ```

---

## 🔒 **Security Best Practices**

### **For Development:**
- ✅ Use sandbox environment only
- ✅ Keep API keys in .env (never commit)
- ✅ Use strong SECRET_KEY

### **For Production:**
- ✅ Use production QuickBooks app
- ✅ Enable HTTPS/SSL
- ✅ Use secure session storage (Redis/database)
- ✅ Implement rate limiting
- ✅ Add API monitoring

---

## 🚀 **Next Steps**

### **Immediate (MVP Testing):**
1. Test all AI query types
2. Verify forecasting accuracy
3. Test with multiple QuickBooks companies
4. Performance testing with larger datasets

### **Enhancement Ideas:**
1. **Advanced AI Agents:**
   - Cash flow optimization
   - Expense categorization
   - Tax planning assistant

2. **Additional Integrations:**
   - Bank account connections
   - CRM integrations
   - E-commerce platforms

3. **Business Features:**
   - Multi-user support
   - Custom report generation
   - Automated insights delivery

### **Production Deployment:**
1. **QuickBooks App Store:**
   - Submit app for review
   - Production OAuth credentials
   - App Store listing

2. **Hosting Options:**
   - AWS/Google Cloud/Azure
   - Docker containerization
   - CI/CD pipeline setup

---

## 📞 **Support & Resources**

### **Documentation:**
- **QuickBooks API:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
- **xAI Grok:** https://x.ai/api (when available)
- **FastAPI:** https://fastapi.tiangolo.com/
- **React:** https://reactjs.org/docs

### **Community:**
- Intuit Developer Community
- xAI Developer Discord/Forums
- Stack Overflow tags: `quickbooks-online`, `fastapi`, `react`

---

## 🎉 **Congratulations!**

You now have a fully functional AI-powered financial analysis tool that:
- ✅ Connects securely to QuickBooks Online
- ✅ Uses advanced Grok AI for financial insights
- ✅ Provides interactive chat interface
- ✅ Generates forecasts and recommendations
- ✅ Ready for production scaling

**Happy building! 🚀**