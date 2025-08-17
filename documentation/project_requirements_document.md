# Project Requirements Document (PRD)

## 1. Project Overview

FinHelm.ai is a web-based financial management platform that fuses traditional bookkeeping and accounting workflows with AI-driven automation and insights. At its core, it offers users a centralized place to connect their existing financial accounts (for example, QuickBooks and Grok), store and organize transaction data, and leverage an intelligent agent to analyze trends, flag anomalies, and generate personalized recommendations. This removes tedious manual tasks and puts actionable insights right at a user’s fingertips.

This system is being built to help small and medium businesses, accountants, and finance teams save time, reduce errors, and make more informed decisions. Key objectives include: fast and secure account linking, reliable data synchronization, clear dashboards for real-time insights, and an AI finance agent that can run custom financial analyses or forecasts on demand. Success will be measured by user adoption rates, average time saved per week, and accuracy of AI-generated recommendations compared to manual analysis.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0)**
- User registration and secure login (email/password).
- OAuth2-based account linking for QuickBooks and Grok.
- Backend data models and schemas for storing transactions, accounts, and reports.
- A React-based dashboard showing key metrics (cash flow, top expenses).
- AI finance agent endpoint that accepts queries (e.g., “Show me last month’s expense trends”) and returns insights.
- Basic reporting: transaction lists, category summaries, and CSV export.
- Environment-driven configuration (using `.env`).
- Logging and error tracking for API calls and AI operations.

**Out-of-Scope (Later Phases)**
- Mobile apps (iOS or Android).
- Payroll, invoicing, or tax-filing modules.
- Multi-currency or multi-entity consolidation.
- Advanced forecasting with multiple AI model versions.
- Third-party integrations beyond QuickBooks and Grok.
- Role-based access control with multiple user roles and permissions.

## 3. User Flow

When a new user arrives, they sign up with an email and password. After verifying their email, they land on a welcome screen with a brief tour of the dashboard. The left sidebar lists sections like **Dashboard**, **Accounts**, **Reports**, and **Settings**. In **Accounts**, the user clicks “Connect QuickBooks” or “Connect Grok,” follows the OAuth2 flow, and sees those services appear in their account list.

Once accounts are linked, the dashboard auto-populates with recent transactions. The user can filter by date or category, view summary cards (e.g., total income, total expenses), and ask the AI agent for deeper insights via a chat-like input at the top. Clicking **Reports** shows downloadable CSVs. Under **Settings**, the user can update their profile, manage API keys, or configure alert thresholds. Each step is a simple page or modal, with loading spinners for data fetches and clear success/error messages.

## 4. Core Features

- **Authentication & Authorization**: Email/password sign-up, login, password reset, session management.
- **Account Linking**: OAuth2-based connectors for QuickBooks and Grok, token refresh logic.
- **Data Modeling & Persistence**: SQLAlchemy (or equivalent) models for users, accounts, transactions, reports.
- **Finance Agent API**: `/ai/insights` endpoint that takes a user’s query, runs it through a configured AI model, and returns structured insights.
- **External Service Modules**: `quickbooks_service.py` and `grok_service.py` for API requests, response parsing, and error handling.
- **Dashboard UI**: React components for summary cards, charts (e.g., line charts for cash flow), transaction tables, and AI chat input.
- **Reporting**: Generating CSV exports and basic visualization of historical data.
- **Configuration Management**: Central `config.py` reading `.env` variables for database URIs, API keys, and AI model parameters.
- **Logging & Error Handling**: Centralized logging for backend and separate frontend notifications for API errors.

## 5. Tech Stack & Tools

- **Backend**
  - Language: Python 3.10+
  - Framework: FastAPI (with Uvicorn)
  - ORM: SQLAlchemy
  - Data Validation: Pydantic
  - AI Integration: OpenAI GPT-4 via `openai` Python SDK
  - External APIs: OAuth2 libraries (e.g., Authlib)
  - Configuration: python-dotenv
  - Testing: pytest, HTTPX for API tests

- **Frontend**
  - Framework: React 18
  - Language: TypeScript
  - State Management: React Query or Redux Toolkit
  - Charts: Recharts or Chart.js
  - Styling: Tailwind CSS
  - API Client: Axios or Fetch
  - Linting & Formatting: ESLint, Prettier

- **Dev Tools & Integrations**
  - IDE: VS Code with Pylance, Prettier, ESLint extensions
  - CI/CD: GitHub Actions for testing and linting
  - Containerization: Docker (Dockerfile for backend, frontend)
  - Monitoring: Sentry for error tracking

## 6. Non-Functional Requirements

- **Performance**: API responses under 200ms for simple CRUD operations; under 1s for AI-driven requests.
- **Scalability**: Support up to 1,000 concurrent users initially; design for horizontal scaling in the future.
- **Security**: All endpoints behind HTTPS; encrypted storage of access tokens; OAuth2 for third-party logins; input validation at the API boundary.
- **Compliance**: GDPR-ready data deletion workflows; ensure no financial data is exposed in logs.
- **Usability**: Responsive layout for desktop and tablet; clear loading states and error messages; keyboard accessibility.
- **Reliability**: 99.9% uptime SLA; retries with exponential backoff for external API calls.

## 7. Constraints & Assumptions

- QuickBooks and Grok APIs are available and support OAuth2 with reasonable rate limits.
- Users possess valid credentials for those services.
- OpenAI GPT-4 access is provisioned and stable.
- The application runs in a cloud environment (e.g., AWS, GCP) with environment variable support.
- No offline mode—users require an active internet connection.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: QuickBooks or Grok may throttle requests. Mitigation: implement caching, batch requests, and exponential backoff retries.
- **Schema Mismatches**: External services can change their response format. Mitigation: add strict validation in service modules and fallback error-handling paths.
- **AI Model Costs & Latency**: GPT-4 calls can be slow or expensive. Mitigation: cache repetitive queries, limit prompt size, and explore lower-cost models for routine tasks.
- **Token Expiry**: OAuth2 tokens must be refreshed. Mitigation: automated refresh workflows and clear error messaging in the UI.
- **Data Privacy**: Financial details are sensitive. Mitigation: ensure encryption at rest and in transit, and purge logs of PII.

---

This PRD should serve as the definitive guide for all subsequent technical documents. It clearly outlines what we are building today, the boundaries, the users’ journey, and the core modules, leaving no room for guesswork.