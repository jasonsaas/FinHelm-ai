# Backend Structure Document

This document outlines the backend architecture, database setup, APIs, hosting, infrastructure, and security measures for FinHelm.ai. It uses everyday language so anyone can understand how the system works.

## 1. Backend Architecture

### Overall Design
- We follow a **modular**, **client-server** approach:
  - **Core**: Loads configuration, environment variables, and sets up the application.
  - **Agents**: Encapsulate AI logic (the finance agent) that processes user queries and returns insights.
  - **Services**: Handle external integrations (QuickBooks, Grok) with OAuth2 flows, request formatting, and error handling.
  - **Database Layer**: Defines data models and schemas for validation.
  - **API Layer**: Exposes RESTful endpoints for frontend interaction and AI queries.

### Key Frameworks and Patterns
- **FastAPI**: Builds high-performance, async-aware HTTP endpoints and auto-generates API docs (OpenAPI).
- **Dependency Injection**: FastAPI’s built-in system keeps components decoupled and testable.
- **Asynchronous I/O**: Uses `async/await` for non-blocking calls to the database and external APIs.
- **ORM & Schemas**: SQLAlchemy for relational models; Pydantic for request/response validation.

### Scalability, Maintainability, Performance
- **Stateless Services**: Backend instances don’t store session data locally, enabling horizontal scaling.
- **Containerization**: Docker ensures each component runs the same way in development and production.
- **Clear Separation of Concerns**: Agents, services, and database code live in separate folders, making it easy to add features or debug.
- **Caching & Async Calls**: Reduces latency for repeated queries and keeps the system responsive under load.

## 2. Database Management

### Database Technology
- Type: **Relational (SQL)**
- System: **PostgreSQL** (ACID compliance, strong consistency)

### Data Modeling and Access
- **SQLAlchemy ORM**: Maps Python classes (models) to database tables.
- **Pydantic Schemas**: Validate and serialize data in and out of API endpoints.
- **Connection Pooling**: Managed by the database driver for efficient reuse of connections.
- **Migrations**: Handled by Alembic (version control for schema changes).

### Data Practices
- **Encryption at Rest**: Database volumes encrypted by the cloud provider (e.g., AWS RDS).  
- **Backups**: Daily automated snapshots with retention policy.  
- **Indexing**: Core tables (users, transactions) have indexes on foreign keys and date columns for fast queries.
- **Archiving**: Old transactions can be exported and purged to keep table sizes manageable.

## 3. Database Schema

### Human-Readable Overview
- **Users**: Store account info (name, email, hashed password, verification status).
- **Accounts**: Link to external services (QuickBooks, Grok), including tokens and expiry dates.
- **Transactions**: Financial records pulled from external services or entered manually (date, amount, category, description).
- **Reports**: Metadata for CSV or dashboard reports (type, date range, owner).
- **API Keys**: User-generated keys for programmatic access, with creation and revocation dates.
- **AI Queries**: Log of user questions and AI responses for auditing and caching.

### SQL Schema (PostgreSQL)
```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- External service accounts
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service_name VARCHAR(50) NOT NULL,
  external_account_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  report_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- AI Queries log
CREATE TABLE ai_queries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  query_text TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```  

## 4. API Design and Endpoints

All APIs follow a RESTful style with clear URLs, HTTP methods, and status codes. FastAPI auto-generates documentation at `/docs`.

### Authentication
- `POST /auth/signup` – Create a new user account.
- `POST /auth/login` – Obtain a JSON Web Token (JWT) after verifying credentials.
- `GET  /auth/verify-email?token=...` – Confirm a new user’s email.
- `POST /auth/forgot-password` – Send a reset link.
- `POST /auth/reset-password` – Update password using a one-time token.

### Account Linking
- `GET  /accounts` – List all linked services (QuickBooks, Grok).
- `POST /accounts` – Start OAuth2 flow to connect a new service.
- `DELETE /accounts/{id}` – Remove a linked service.

### Transactions & Reports
- `GET  /transactions` – Fetch a user’s transactions with optional filters (date range, category).
- `POST /transactions` – Add a manual transaction.
- `GET  /reports` – List past reports.
- `POST /reports` – Generate a new report (returns CSV download URL).

### AI Insights
- `POST /ai/insights` – Send a natural-language question to the finance agent; returns structured insights.

### API Keys
- `GET  /api-keys` – List a user’s keys.
- `POST /api-keys` – Generate a new API key.
- `DELETE /api-keys/{id}` – Revoke an existing key.

## 5. Hosting Solutions

- **Cloud Provider**: AWS (elastic services) or GCP, chosen for reliability and global reach.
- **Containers**: Docker images for backend and frontend ensure consistent environments.
- **Container Management**: AWS ECS/EKS or GCP GKE for orchestrating multiple instances.
- **Database**: Managed PostgreSQL (Amazon RDS or Cloud SQL) with automatic backups.

**Benefits**
- **Reliability**: SLAs from cloud providers guarantee 99.9% uptime.
- **Scalability**: Add or remove instances based on traffic patterns.
- **Cost-Effectiveness**: Pay-as-you-go pricing and right-sized instances.

## 6. Infrastructure Components

- **Load Balancer**: Distributes incoming HTTP(S) traffic across backend instances.
- **Reverse Proxy**: NGINX handles SSL termination and static asset caching.
- **Cache Layer**: Redis for:
  - Session caching (if needed).
  - Caching frequent external API responses and AI query results.
- **Content Delivery Network (CDN)**: CloudFront (AWS) or Cloud CDN (GCP) for delivering frontend assets (JavaScript, CSS).
- **Message Queue (Optional)**: RabbitMQ or AWS SQS for background tasks (e.g., syncing transactions overnight).

These pieces work together to minimize latency, balance load, and ensure a smooth user experience.

## 7. Security Measures

- **Transport Security**: All traffic over HTTPS with strong TLS configuration.
- **Authentication**:
  - JWT tokens for user sessions, with short expirations.
  - OAuth2 for external services (QuickBooks, Grok) with automatic token refresh.
- **Encryption**:
  - Environment variables store secrets outside of code.
  - Database volumes encrypted at rest by the cloud provider.
  - Sensitive fields (passwords, tokens) hashed or encrypted before storage.
- **Input Validation**: Pydantic schemas validate every request to prevent injection or malformed data.
- **Rate Limiting**: Throttle API requests to protect against abuse.
- **Audit Logging**: Record key events (logins, account link/unlink, AI queries) for compliance.
- **Vulnerability Scanning**: Regular dependency checks and container image scans.

## 8. Monitoring and Maintenance

- **Error Tracking**: Sentry captures exceptions and performance bottlenecks in real time.
- **Metrics & Alerts**: Prometheus + Grafana (or cloud native monitoring) track:
  - CPU, memory, and response times.
  - Database connection usage.
  - Rate of 5xx errors.
- **Logging**: Structured logs (JSON) sent to a log management system (e.g., AWS CloudWatch, ELK).
- **Health Checks**: Liveness and readiness probes for container orchestrator.
- **CI/CD**: GitHub Actions run tests, lint code, build containers, and deploy to staging/production.
- **Scheduled Maintenance**: Automated database vacuuming, index rebuilding, and security patch updates.

## 9. Conclusion and Overall Backend Summary

FinHelm.ai’s backend is built for **scalability**, **maintainability**, and **security**:
- A **modular** FastAPI application with clear separation between AI agents, external services, and data models.
- **PostgreSQL** database with well-defined schemas and migration support.
- **RESTful APIs** that connect the React frontend, AI agent, and third-party services.
- **Cloud-native hosting** with Docker, load balancing, and managed services for reliability.
- **Robust security** with HTTPS, OAuth2, JWTs, and encrypted secrets.
- **Monitoring** and **automation** that keep the system healthy and the team informed.

Together, these components provide a solid foundation for FinHelm.ai’s current features and future growth, ensuring users get fast, secure, and AI-powered financial insights.
