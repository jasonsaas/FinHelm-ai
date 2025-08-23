# Project Requirements Document (PRD)

## 1. Project Overview
FinHelm-ai is a personal finance management platform that helps users take control of their money by providing a clear, organized way to track accounts, record transactions, and review spending patterns. It solves the common problem of scattered financial data by offering a centralized web interface and a set of robust APIs that unify user profiles, bank accounts, and transaction histories in one place.

The project is being built to give individuals a modern, secure, and easy-to-use tool for budgeting, expense tracking, and financial planning. Key objectives include: ensuring data privacy with strong authentication, delivering real-time access to up-to-date financial information, and providing a clean, intuitive user experience. Success will be measured by system reliability (99.9% uptime), API response times under 300ms, and positive user feedback on usability and accuracy of financial insights.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- User Registration and Authentication (signup, login, password hashing, JWT tokens)
- User Profile Management (view and update personal details)
- Account Management CRUD (create, read, update, delete checking/savings/credit accounts)
- Transaction Recording and Retrieval (add, list, delete, categorize income and expenses)
- Centralized Error Handling (consistent error response format)
- Environment-based Configuration (`.env` variables for secrets and database)
- Basic Frontend Shell (screens for login/signup, dashboard, accounts list, transactions list)
- RESTful API Documentation Stub (OpenAPI/Swagger placeholder)

### Out-of-Scope (Later Phases)
- Complex Financial Reports and Visualizations (charts, budgets, forecasting)
- Third-party Bank Integrations (Plaid, Stripe)
- Mobile Applications or Native SDKs
- Role-based Access Control beyond basic user vs. admin
- Multi-currency or internationalization support
- AI-driven financial insights or recommendations
- Real-time notifications or alerts

## 3. User Flow
When a new user visits FinHelm-ai, they land on a welcome page prompting them to sign up or log in. Upon choosing sign up, they enter their email, password, and basic profile information. After submitting, they receive a confirmation and are taken to the main dashboard. Returning users simply log in with their credentials and are directed to the same dashboard.

On the dashboard, the user sees an overview panel showing total balance across accounts and recent transactions. A left-hand navigation menu lets them switch between pages: Accounts, Transactions, and Profile. To add a new account, they click “Add Account,” fill in account name, type, and opening balance, then submit. To record a transaction, they go to Transactions, click “New Transaction,” select an account, enter amount, date, category, and description, and save. All changes instantly reflect in the dashboard totals.

## 4. Core Features
- **Authentication Module**: Secure signup/login, JWT token issuance, password hashing (bcrypt).
- **User Profile**: GET/PUT endpoints for user details; front-end form to update name and email.
- **Account Management**: REST endpoints to create, read, update, delete accounts; front-end list and form UI.
- **Transaction Management**: Endpoints to add, list (with filters by date/category), and delete transactions; forms and tables on the front end.
- **Error Handling Middleware**: Central code to catch exceptions, format errors as `{ code, message }`, and send consistent HTTP status codes.
- **Configuration Loader**: Reads environment variables for database connection, JWT secret, and application port.
- **API Docs Stub**: Initial OpenAPI schema file with paths for auth, users, accounts, transactions.

## 5. Tech Stack & Tools
- **Backend**: Node.js with Express.js, TypeScript for static typing.
- **Database**: PostgreSQL (via node-postgres) or SQLite for quick setup.
- **Frontend**: React.js with TypeScript, React Router for navigation.
- **Authentication**: JSON Web Tokens (JWT), bcrypt for password hashing.
- **Configuration**: dotenv for environment variables.
- **Error Handling**: Custom Express middleware.
- **API Docs**: Swagger UI / OpenAPI.
- **IDE & Plugins**: VS Code with ESLint, Prettier, and TypeScript extensions.

## 6. Non-Functional Requirements
- **Performance**: API endpoints must respond within 300ms under normal load (up to 100 concurrent users).
- **Scalability**: Modular codebase to allow adding new modules without major refactoring.
- **Security**: HTTPS everywhere; input validation to prevent injection attacks; secure storage of JWT secrets.
- **Usability**: Front-end pages load under 2 seconds on standard broadband.
- **Reliability**: Target 99.9% uptime for backend services.
- **Maintainability**: Code should have clear layering (routes → services → data access) and inline documentation.

## 7. Constraints & Assumptions
- **Constraint**: The backend will use Postgres; deploying to environments that support it (e.g., Heroku, AWS RDS).
- **Assumption**: No existing user base—user data starts empty.
- **Assumption**: Frontend will be deployed separately (e.g., on Netlify or Vercel).
- **Constraint**: Must use Node.js 16+ and TypeScript 4+.
- **Assumption**: Environment variables will be provided by CI/CD pipeline.

## 8. Known Issues & Potential Pitfalls
- **Database Migrations**: Without an ORM, manual SQL migrations can be error-prone. Quick Mitigation: Introduce a simple migration tool (e.g., node-pg-migrate).
- **JWT Blacklisting**: Logged-out tokens remain valid until expiry. Future solution: token revocation list in Redis.
- **Input Validation**: Missing validation could allow bad data. Recommendation: use Zod or Joi at route boundaries.
- **CORS Configuration**: If misconfigured, front-end may fail to call APIs. Ensure wildcard origins are locked down in production.
- **Error Leak**: Stack traces could expose internals. Middleware must strip stack details in production.

---

This document provides a clear reference for both AI-driven generation of technical designs and human developers. All sections specify exactly what needs to be built, how users will interact with it, and which technologies and safeguards to employ. Subsequent documents—such as detailed Tech Stack guidelines or Frontend Architecture specs—can be created directly from this PRD without further clarification.