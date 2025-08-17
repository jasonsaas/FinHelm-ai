# FinHelm.ai Security Guidelines

This document captures security best practices tailored to the FinHelm.ai architecture. It integrates core security principles—Security by Design, Least Privilege, Defense in Depth, and Secure Defaults—into actionable guidelines for every layer of the application.

---

## 1. Security by Design

- **Embed security early**: Include threat modeling during feature planning (e.g., AI agent endpoints, QuickBooks/Grok integrations).
- **Secure defaults**: Ship configurations that disable debug modes, enforce HTTPS, and apply least-privilege permissions out of the box.
- **Fail securely**: On errors, return generic messages to users; log detailed diagnostics to secure, access-controlled logs.

## 2. Authentication & Access Control

### 2.1 User Authentication
- Use **FastAPI**’s dependency injection to centralize authentication logic.
- Store passwords with **Argon2** or **bcrypt** + unique salts.
- Enforce strong password policies (minimum length, complexity, rotation reminders).
- Implement email verification and password reset flows with time-limited, single-use tokens.
- Support optional **MFA** (TOTP or SMS) for elevated privileges.

### 2.2 Session & Token Management
- Use **JWT** only for stateless microservices; validate `alg`, verify signatures, check `exp`/`nbf` claims, and rotate keys regularly.
- For session cookies, set `HttpOnly`, `Secure`, and `SameSite=Strict` attributes.
- Enforce idle (e.g., 15 min) and absolute (e.g., 8 hr) session timeouts.
- Invalidate sessions after password changes or suspicious activities.

### 2.3 Role-Based Access Control (RBAC)
- Define roles (e.g., `admin`, `accountant`, `viewer`) and permissions in a central module.
- Perform server-side authorization checks on every API endpoint, including AI and service integration calls.
- Fail access checks explicitly (HTTP 403) and audit all unauthorized attempts.

## 3. Input Handling & Processing

- **Validate every input** using **Pydantic** schemas on FastAPI routes. Deny unknown or extra fields.
- **Sanitize and encode** all user content rendered in React to thwart XSS. Leverage libraries like **DOMPurify** for any rich text.
- Use parameterized queries or SQLAlchemy ORM to avoid SQL injection.
- Validate OAuth2 redirect URIs against an allow-list.
- For file uploads (e.g., CSV exports/imports):
  - Check MIME types and file extensions.
  - Limit file size.
  - Store uploads outside the webroot with randomized names.
  - Scan files with antivirus/malware tools.
- Never rely solely on client-side checks; enforce all validation on the server.

## 4. Data Protection & Privacy

- **TLS enforcement**: Terminate all traffic via TLS 1.2+; redirect HTTP -> HTTPS.
- **Encrypt at rest**:
  - Use encrypted volumes or database encryption (e.g., PostgreSQL TDE).
  - Store sensitive records (e.g., OAuth tokens) encrypted in the database.
- **Secrets management**:
  - Do not keep API keys or database credentials in code or `.env` files in version control.
  - Use a secrets manager (AWS Secrets Manager, HashiCorp Vault).
- **Log sanitization**: Mask PII (email addresses, account numbers) in logs. Configure Sentry to redact sensitive fields.
- **Privacy compliance**:
  - Provide data deletion workflows (GDPR).
  - Audit data retention policies.

## 5. API & Service Security

- Host all APIs (REST, AI) under strict HTTPS and HSTS headers.
- **Rate limit** all external-facing endpoints (e.g., `/ai/insights`, QuickBooks sync) to mitigate DoS.
- Use restrictive **CORS** allowing only your frontend origin(s).
- Validate and sanitize all data consumed from QuickBooks and Grok before persistence.
- Leverage FastAPI’s dependency injection to include authorization checks on every route.
- Version APIs (e.g., `/v1/ai/insights`) to manage changes and deprecations safely.

## 6. Web Application Security Hygiene

- Enable security headers on all responses:
  - `Content-Security-Policy` restricting scripts/styles to your domain and vetted CDNs with SRI.
  - `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: no-referrer-when-downgrade`.
- Protect state-changing requests against CSRF using synchronizer tokens or modern SameSite cookies.
- Avoid storing tokens in `localStorage`; prefer secure, `HttpOnly` cookies or in-memory storage.
- Sanitize React component props from external sources.

## 7. Infrastructure & Configuration Management

- **Harden servers**:
  - Apply OS and package patches regularly.
  - Disable unused ports and services.
  - Enforce firewall rules restricting inbound traffic to necessary ports (e.g., 443, 22).
- **Container security**:
  - Use minimal base images.
  - Scan images for vulnerabilities.
  - Drop unnecessary Linux capabilities.
- **CI/CD pipelines**:
  - Fail builds on failed tests or linter/security scans.
  - Require code reviews and enforce branch protection in GitHub.
  - Rotate CI secrets regularly.
- Disable debug and verbose logging in production.

## 8. Dependency Management

- Maintain a lockfile (`poetry.lock`, `requirements.txt` + `pip-compile`).
- Run an automated SCA tool (e.g., Dependabot, Snyk) to detect vulnerable dependencies.
- Review and approve dependency updates; remove unused packages.

## 9. DevOps & CI/CD Security

- Store all credentials and tokens in a dedicated secret vault; inject them into CI pipelines at runtime only.
- Limit CI service account permissions (least privilege) on target environments.
- Scan IaC (e.g., Terraform, Dockerfiles) for misconfigurations (e.g., open security groups) before deployment.
- Implement automated infrastructure drift detection and alerts for unauthorized changes.

---

Adherence to these guidelines will ensure FinHelm.ai remains robust against evolving threats, preserves customer trust, and meets regulatory obligations. Regularly review and update this document as the platform and threat landscape evolve.