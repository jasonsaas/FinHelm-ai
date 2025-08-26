# Backend Structure Document

This document explains the backend setup for FinHelm-ai in everyday language. It covers the architecture, databases, APIs, hosting, infrastructure, security, monitoring, and more so that anyone can understand how the server side is built and why.

## 1. Backend Architecture

**Overall Design**
- The backend is a Node.js server built with Express.js and TypeScript.  
- It follows a feature-based, modular structure: each area (authentication, users, accounts, transactions) has its own folder with routes and related logic.  
- Configuration, middleware, and route definitions are kept in separate directories, so things stay organized.

**Key Design Patterns and Frameworks**
- **Express.js** for routing and middleware.  
- **TypeScript** for static typing, which catches mistakes early and makes code easier to understand.  
- **Middleware Pipeline**: body parsing, CORS, authentication checks, and a central error handler.

**How It Supports Scalability, Maintainability, and Performance**
- **Scalability**: Modular code lets you add new features without touching unrelated parts.  
- **Maintainability**: TypeScript interfaces and clear folder structure mean new developers can get up to speed quickly.  
- **Performance**: Express’s lightweight core and the event-driven model of Node.js let the server handle many requests efficiently.

## 2. Database Management

**Database Technology**
- We use **PostgreSQL**, a relational (SQL) database, to store users, accounts, and transactions.  
- Locally or for quick demos, we can swap in **SQLite**, but production runs on Postgres.

**How Data Is Structured, Stored, and Accessed**
- A database configuration module reads the connection string from environment variables and establishes a pool of connections.  
- All queries go through parameterized statements to prevent SQL injection.  
- We keep SQL scripts (or a migration tool like `node-pg-migrate`) to version-control schema changes.

**Data Management Practices**
- **Backups**: Automated daily backups of the PostgreSQL database.  
- **Migrations**: Use a migration tool to evolve the schema without manual SQL edits.  
- **Indexes**: We index foreign keys and frequently queried columns (e.g., `user_id`, `account_id`) to speed up lookups.

## 3. Database Schema

**Human-Readable Description**

1. **Users** table holds each user’s account details: ID, name, email, hashed password, and timestamps.  
2. **Accounts** table links to a user and stores financial accounts (checking, savings, credit) with names and balances.  
3. **Transactions** table links to an account and records each money movement: amount, category, date, and description.

**PostgreSQL Schema (SQL)**
```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                -- e.g., "checking", "savings", "credit"
  balance NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. API Design and Endpoints

**API Style**
- The APIs follow RESTful principles.  
- All endpoints start with `/api`, and resources are nouns (e.g., `/api/users`, `/api/accounts`).  
- We use JSON for both requests and responses.

**Key Endpoints**

1. **Authentication** (`/api/auth`)  
   - `POST /register`: Create a new user (requires name, email, password).  
   - `POST /login`: Log in an existing user (email, password), returns a JWT.  
   - `POST /logout` (optional): Invalidate the user’s token.

2. **Users** (`/api/users`)  
   - `GET /:id`: Get user profile details.  
   - `PUT /:id`: Update user name or email.  
   - `POST /forgot-password` & `POST /reset-password`: Handle password resets.

3. **Accounts** (`/api/accounts`)  
   - `GET /`: List all accounts for the current user.  
   - `POST /`: Create a new account.  
   - `PUT /:id`: Update account name, type, or balance.  
   - `DELETE /:id`: Delete an account.

4. **Transactions** (`/api/transactions`)  
   - `GET /`: List transactions (supports filters by date or category).  
   - `POST /`: Record a new transaction.  
   - `GET /:id`: Get details for one transaction.  
   - `DELETE /:id`: Remove a transaction.

**How They Communicate**
- The frontend attaches the JWT in the `Authorization` header.  
- Middleware checks the token, extracts the user ID, and attaches it to the request.  
- Route handlers read that ID to scope data (e.g., only fetch accounts belonging to that user).

## 5. Hosting Solutions

**Where It Runs**
- **Cloud Provider**: We recommend Heroku with Heroku Postgres for simplicity, or AWS Elastic Beanstalk / ECS if you need more control.  
- **Docker**: The app can be containerized, making deployment to any cloud or on-premise environment straightforward.

**Benefits**
- **Reliability**: Platforms like Heroku manage restarts, health checks, and can automatically replace unhealthy instances.  
- **Scalability**: You can scale web dynos (Heroku) or container replicas (AWS ECS) up or down based on traffic.  
- **Cost-Effectiveness**: Pay-as-you-go pricing lets you start small and only pay for what you use.

## 6. Infrastructure Components

**Load Balancers**
- Distribute incoming API requests across multiple server instances to prevent any one instance from getting overwhelmed.

**Caching Mechanisms**
- Optionally use **Redis** to cache frequent reads (e.g., account summaries) and speed up response times.  
- Future token revocation lists (for logout) can also live in Redis.

**Content Delivery Network (CDN)**
- While the CDN is primarily for frontend assets, a service like **Cloudflare** can sit in front of the backend too, caching static JSON or blocking malicious traffic.

**How They Work Together**
1. A user’s request hits the CDN or load balancer.  
2. It’s routed to one of the backend instances.  
3. If data is cached in Redis, the server returns it immediately.  
4. Otherwise, the server queries PostgreSQL and may populate or update the cache.  
5. The response goes back through the load balancer (and CDN) to the user.

## 7. Security Measures

**Authentication & Authorization**
- **JWTs** (JSON Web Tokens) secure endpoints. Tokens are signed with a secret and expire after a set time.  
- **bcrypt** hashes user passwords before storing them in the database.  
- Middleware checks tokens on every protected route.

**Data Encryption**
- All traffic runs over **HTTPS**.  
- Database credentials, JWT secrets, and other sensitive values live in environment variables, never in code.

**Other Protocols and Practices**
- **CORS**: Only allowed origins can call the API.  
- **Helmet** middleware (or similar) sets safe HTTP headers.  
- **Input Validation**: We recommend libraries like **Joi** or **Zod** to validate request bodies and prevent injection attacks.  
- **Rate Limiting**: Optionally use middleware to block clients that make too many requests.

## 8. Monitoring and Maintenance

**Monitoring Tools**
- **Logging**: Use a structured logger like **Winston** or **Pino** to capture errors and important events.  
- **Performance Monitoring**: Integrate with **Datadog**, **New Relic**, or **Prometheus** + **Grafana** to track response times, error rates, and resource usage.  
- **Uptime Checks**: Services like **UptimeRobot** or **Pingdom** regularly hit key endpoints to ensure they’re alive.

**Maintenance Strategies**
- **Automated Tests**: Unit tests for services, integration tests for routes, and end-to-end tests for workflows.  
- **CI/CD Pipeline**: GitHub Actions runs linting, type checks, and tests on each push. Passing builds can auto-deploy to staging or production.  
- **Scheduled Updates**: Regular dependency updates and security patches.  
- **Database Migrations**: Versioned migrations ensure that schema changes happen in a controlled way.

## 9. Conclusion and Overall Backend Summary

The FinHelm-ai backend is a modern, modular Node.js service that:  
- Leverages Express.js and TypeScript for clear, maintainable code.  
- Stores data in PostgreSQL with a simple, well-indexed schema for users, accounts, and transactions.  
- Exposes a RESTful API with JWT-based security and centralized error handling.  
- Runs on managed hosting (Heroku, AWS) with load balancing, optional Redis caching, and CDN protection.  
- Follows best practices for security, monitoring, and automated maintenance.

This setup meets the project goals of reliability, performance, and ease of development. It provides a strong foundation to grow future features—like bank integrations, advanced analytics, or mobile apps—without major rewrites.