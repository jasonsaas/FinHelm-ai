# FinHelm-ai Tech Stack Document

This document explains the technologies chosen for FinHelm-ai in simple, everyday language. Each section describes what tools we’re using, why we picked them, and how they help deliver a smooth, reliable finance-tracking app.

## 1. Frontend Technologies

We built the user interface with modern, widely adopted tools that make it easy to develop, maintain, and extend the app:

- **React.js with TypeScript**
  • React gives us a component-based way to build screens (login, dashboard, accounts, transactions).  
  • TypeScript adds static typing, so we catch many mistakes early and get better code completion in our editor.

- **React Router**
  • Manages navigation between pages (e.g., Dashboard ↔ Accounts ↔ Transactions ↔ Profile) without full page reloads.

- **CSS (with optional CSS Modules)**
  • Provides styling for all visual elements—buttons, forms, tables, navigation menus.
  • Using CSS Modules keeps styles scoped to each component, avoiding naming conflicts.

- **Development Tools**
  • **ESLint & Prettier** for consistent code style and automatic formatting.  
  • **VS Code** with TypeScript and React extensions for an efficient coding experience.

**How these choices enhance UX and UI design**  
React’s component approach lets us build interactive, responsive screens. TypeScript reduces bugs before they reach users. React Router keeps navigation fast, and scoped CSS ensures styles stay organized as the app grows.

## 2. Backend Technologies

Our server side powers all data operations—handling user accounts, transactions, and authentication—with the following stack:

- **Node.js & Express.js**
  • Node.js provides a fast, event-driven JavaScript runtime on the server.  
  • Express.js is a minimal framework for defining RESTful API routes (`/api/auth`, `/api/accounts`, `/api/transactions`, `/api/users`).

- **TypeScript**
  • Enforces types on request handlers, database results, and other modules, boosting reliability and maintainability.

- **Database**
  • **PostgreSQL** (via the `pg` library) for production—robust, scalable relational storage.  
  • **SQLite** (optional) for quick local setup or prototyping.

- **Authentication & Security**
  • **bcrypt** for secure password hashing.  
  • **JSON Web Tokens (JWT)** for stateless session management.

- **Configuration**
  • **dotenv** loads environment-specific settings (database URLs, JWT secrets, ports) from a `.env` file.

- **Centralized Middleware**
  • **Error Handler** intercepts exceptions, formats responses, and ensures consistent error messages.  
  • **CORS** and **body-parsing** middleware for cross-origin requests and JSON payloads.

- **API Documentation**
  • **Swagger / OpenAPI** stub provides a living blueprint of available endpoints for developers.

**Interaction and Data Flow**  
When a browser calls `/api/transactions`, Express routes that request to the transactions handler. That code uses our database module to perform CRUD operations. If anything goes wrong, our error-handling middleware formats a helpful error response.

## 3. Infrastructure and Deployment

To keep the app reliable, easy to update, and scalable, we use the following infrastructure and processes:

- **Version Control**
  • **Git** for code management.  
  • Hosted on **GitHub** (or any Git provider) for collaboration and code review.

- **Continuous Integration / Continuous Deployment (CI/CD)**
  • **GitHub Actions** automates linting, type-checking, and tests on every push.  
  • Successful builds can trigger automatic deployments.

- **Hosting Platforms**
  • **Backend:** Heroku (with Heroku Postgres) or AWS Elastic Beanstalk / ECS for Node.js services.  
  • **Frontend:** Netlify or Vercel for fast, global static hosting of the React app.

- **Environment Management**
  • Secrets and configuration variables are injected by the CI/CD pipeline into each hosting environment.  
  • `.env.example` ensures every developer knows which settings are required.

These choices give us automatic testing on every change, one-click deployments, and clear environment separation (development, staging, production).

## 4. Third-Party Integrations

In Version 1, FinHelm-ai minimizes external dependencies to focus on core finance features. Out-of-scope integrations (like Plaid or Stripe) will come in later phases.

Current third-party libraries and services include:

- **dotenv** for configuration management.  
- **Swagger UI** for API documentation (developer-facing).  
- **ESLint / Prettier** (developer tools) to enforce code quality.

By limiting external services, we reduce security surface area and simplify maintenance in this initial release.

## 5. Security and Performance Considerations

We’ve built in several safeguards and optimizations to protect user data and keep the app responsive:

Security Measures:
- Passwords are never stored in plain text—**bcrypt** hashes them before saving.  
- **JWT** tokens are signed with a secret and have an expiration time.  
- Sensitive settings (database credentials, JWT secrets) live in environment variables, not code.  
- **CORS** policies restrict which origins can call our APIs.  
- Centralized error middleware removes stack traces in production to avoid leaking internal details.

Performance Optimizations:
- **Node.js** handles many concurrent connections efficiently with its event loop.  
- Database queries are parameterized to use indexes effectively.  
- Large JSON payloads are parsed and validated via middleware to fail fast on bad requests.  
- **Lazy loading** of frontend code (React’s `Suspense` and dynamic imports) reduces initial page weight.

**Future enhancements** (already planned): input validation with libraries like Zod or Joi, request logging with Winston or Pino, and caching frequently accessed data.

## 6. Conclusion and Overall Tech Stack Summary

FinHelm-ai brings together a modern, type-safe frontend (React + TypeScript) and a lean, express-based backend (Node.js + TypeScript) backed by PostgreSQL. We use best practices—centralized error handling, environment-based configuration, JWT security, and automated CI/CD—to deliver a dependable personal finance tool. Our stack prioritizes:

- **Developer Productivity:** Through TypeScript, ESLint/Prettier, and React’s component model.  
- **Reliability:** Via modular architecture, automated tests, and clear separation of concerns.  
- **User Trust and Security:** With hashed passwords, signed tokens, and secure environment management.  
- **Scalability:** Hosting on managed platforms and a code structure that lets us add new features (bank integrations, reports, AI-driven insights) without major rewrites.

This balanced set of technologies ensures FinHelm-ai is easy to build on, maintain, and grow—while delivering a smooth, secure experience for users tracking their personal finances.