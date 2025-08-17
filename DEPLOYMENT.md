# ERPInsight.ai Production Deployment Guide

This guide covers the complete production deployment of ERPInsight.ai with Docker containerization, custom agent builder, and comprehensive monitoring.

## 🚀 Quick Start (Production Ready)

### 1. Prerequisites

- Docker & Docker Compose installed
- Domain name configured with DNS
- SSL certificates (Let's Encrypt recommended)
- QuickBooks Online Developer App configured
- Anthropic Claude API key

### 2. Clone and Configure

```bash
git clone https://github.com/yourusername/erpinsight-ai.git
cd erpinsight-ai

# Copy and configure environment
cp .env.production .env
# Edit .env with your actual values
```

### 3. Configure Environment Variables

Edit `.env` file with your production values:

```bash
# Required - Application
APP_NAME="ERPInsight.ai"
SECRET_KEY="your-super-secret-production-key-change-this-please"
CORS_ORIGINS="https://yourdomain.com"

# Required - Database
POSTGRES_PASSWORD="secure_password_here"

# Required - APIs
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
QBO_CLIENT_ID="your-quickbooks-app-client-id"
QBO_CLIENT_SECRET="your-quickbooks-app-client-secret"
QBO_REDIRECT_URI="https://yourdomain.com/auth/quickbooks/callback"

# Required - Domain
REACT_APP_API_URL="https://api.yourdomain.com"
```

### 4. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Option 1: Let's Encrypt (Recommended)
certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Option 2: Self-signed (Development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem
```

### 5. Deploy

```bash
# Build and start all services
docker-compose up -d --build

# Check service health
docker-compose ps
docker-compose logs -f backend

# Run database migrations
docker-compose exec backend python -c "from app.db.database import engine; from app.db import models; models.Base.metadata.create_all(bind=engine)"
```

### 6. Verify Deployment

- Frontend: `https://yourdomain.com`
- API Health: `https://api.yourdomain.com/health`
- Admin Panel: Available after creating first user

## 📋 Detailed Configuration

### QuickBooks Online App Setup

1. Go to [QuickBooks Developer Console](https://developer.intuit.com/app/developer/myapps)
2. Create new app or use existing
3. Configure OAuth redirect URI: `https://yourdomain.com/auth/quickbooks/callback`
4. Note down Client ID and Client Secret
5. Set environment to "Production" when ready

### Anthropic Claude API Setup

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Set usage limits and monitoring
4. Add to environment variables

### Domain & DNS Configuration

```
# A Records
yourdomain.com       -> your-server-ip
api.yourdomain.com   -> your-server-ip

# Or use subdomains
app.yourdomain.com   -> your-server-ip (frontend)
api.yourdomain.com   -> your-server-ip (backend)
```

## 🛠 Advanced Configuration

### Custom Agent Builder

The application includes a sophisticated custom agent builder that allows users to:

- **Create Custom AI Agents**: Define specialized agents with custom prompts and tool configurations
- **Agent Templates**: Pre-built templates for Finance, Sales, and Operations agents
- **Tool Selection**: Choose from available tools like QuickBooks queries, financial analysis, forecasting
- **Visual Customization**: Set colors, icons, and descriptions for agents
- **Testing & Validation**: Test agents before deployment with sample queries
- **Agent Management**: Edit, activate/deactivate, and delete custom agents

#### Available Tools for Custom Agents

1. **quickbooks_query**: Query QuickBooks data (accounts, transactions, customers)
2. **financial_analysis**: Perform financial calculations and ratio analysis
3. **data_visualization**: Generate charts and graphs from business data
4. **forecasting**: Create predictions based on historical data
5. **expense_categorization**: Automatically categorize and analyze expenses
6. **customer_analysis**: Analyze customer behavior and lifetime value
7. **inventory_optimization**: Optimize inventory levels and identify stock issues

#### Creating Custom Agents via API

```bash
# Create custom agent
curl -X POST https://api.yourdomain.com/api/agents/custom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "name": "Customer Retention Specialist",
    "description": "Focuses on identifying at-risk customers and retention strategies",
    "prompt": "You are a Customer Retention AI Agent...",
    "tools": [
      {"name": "quickbooks_query", "description": "Query customer data", "enabled": true},
      {"name": "customer_analysis", "description": "Analyze customer behavior", "enabled": true}
    ],
    "color": "purple",
    "icon": "UserIcon"
  }'

# Test custom agent
curl -X POST https://api.yourdomain.com/api/agents/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "agent": {agent_config_here},
    "query": "Who are my at-risk customers?"
  }'
```

### Database Migrations

```bash
# Create migration
docker-compose exec backend alembic revision --autogenerate -m "Add custom agents"

# Apply migration
docker-compose exec backend alembic upgrade head
```

### Redis Cache Configuration

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Monitor cache usage
docker-compose exec redis redis-cli info memory
docker-compose exec redis redis-cli monitor
```

### Nginx Load Balancing (Multiple Backend Instances)

```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
    keepalive 32;
}
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl https://api.yourdomain.com/health

# Service status
docker-compose ps

# Resource usage
docker stats

# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Run daily via cron

# Database backup
docker-compose exec -T db pg_dump -U postgres erpinsight > backup_$(date +%Y%m%d).sql

# Vector store backup
docker-compose exec -T backend tar -czf - /app/data/vector_store > vectors_$(date +%Y%m%d).tar.gz

# Keep 30 days of backups
find . -name "backup_*.sql" -mtime +30 -delete
find . -name "vectors_*.tar.gz" -mtime +30 -delete
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt certificates (run monthly)
certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
```

### Performance Optimization

1. **Database Indexing**:
   ```sql
   CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
   CREATE INDEX idx_custom_agents_user_id ON custom_agents(user_id);
   CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
   ```

2. **Redis Cache Tuning**:
   ```bash
   # Increase memory limit
   docker-compose exec redis redis-cli CONFIG SET maxmemory 512mb
   docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. **Application Scaling**:
   ```yaml
   # docker-compose.yml
   backend:
     deploy:
       replicas: 3
       resources:
         limits:
           memory: 1G
         reservations:
           memory: 512M
   ```

## 🔧 Troubleshooting

### Common Issues

1. **QuickBooks Connection Failed**
   ```bash
   # Check OAuth configuration
   docker-compose logs backend | grep -i quickbooks
   # Verify redirect URI matches exactly
   ```

2. **Claude API Errors**
   ```bash
   # Check API key and rate limits
   curl -H "x-api-key: your-key" https://api.anthropic.com/v1/messages
   ```

3. **Database Connection Issues**
   ```bash
   # Check database container
   docker-compose exec db pg_isready -U postgres
   # Reset database
   docker-compose down -v && docker-compose up -d
   ```

4. **Custom Agent Creation Fails**
   ```bash
   # Check database schema
   docker-compose exec backend python -c "from app.db import models; print(models.CustomAgent.__table__.columns.keys())"
   # Verify user authentication
   docker-compose logs backend | grep -i "custom agent"
   ```

### Performance Issues

```bash
# Check resource usage
docker stats --no-stream

# Database performance
docker-compose exec db psql -U postgres -d erpinsight -c "SELECT * FROM pg_stat_activity;"

# Application metrics
curl https://api.yourdomain.com/health
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database Security**: Use strong passwords and enable SSL
3. **API Keys**: Rotate regularly and monitor usage
4. **Network Security**: Use firewall rules and VPN when possible
5. **SSL/TLS**: Always use HTTPS in production
6. **User Authentication**: Implement proper session management
7. **Rate Limiting**: Prevent API abuse
8. **Input Validation**: Sanitize all user inputs
9. **Audit Logging**: Enable comprehensive logging for security events

## 📈 Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
    depends_on:
      - db
      - redis
      
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx-prod.conf:/etc/nginx/nginx.conf
```

### Database Scaling

```yaml
# Read replicas
db-replica:
  image: postgres:15-alpine
  environment:
    - POSTGRES_DB=erpinsight
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - PGUSER=postgres
  command: |
    postgres 
    -c wal_level=replica 
    -c hot_standby=on 
    -c max_wal_senders=10 
    -c max_replication_slots=10
```

## 📱 Mobile & PWA Support

The frontend is built with responsive design and PWA capabilities:

```bash
# Enable PWA features
cd frontend
npm install workbox-webpack-plugin
# Configure service worker for offline support
```

## 🎯 Custom Agent Examples

### 1. Inventory Management Agent

```json
{
  "name": "Inventory Optimizer",
  "description": "Specializes in inventory management and optimization strategies",
  "prompt": "You are an Inventory Management AI Agent. Your role is to analyze inventory levels, identify overstocked or understocked items, and provide actionable recommendations for inventory optimization. Always provide specific item names, quantities, and reorder suggestions.",
  "tools": [
    {"name": "quickbooks_query", "enabled": true},
    {"name": "inventory_optimization", "enabled": true},
    {"name": "data_visualization", "enabled": true},
    {"name": "forecasting", "enabled": true}
  ],
  "color": "green",
  "icon": "CubeIcon"
}
```

### 2. Tax Preparation Agent

```json
{
  "name": "Tax Preparation Assistant",
  "description": "Helps organize financial data for tax preparation and compliance",
  "prompt": "You are a Tax Preparation AI Agent. Your role is to help organize financial data for tax filing, identify potential deductions, and ensure compliance with tax regulations. Always provide specific transaction categories and amounts relevant to tax preparation.",
  "tools": [
    {"name": "quickbooks_query", "enabled": true},
    {"name": "financial_analysis", "enabled": true},
    {"name": "expense_categorization", "enabled": true},
    {"name": "data_visualization", "enabled": true}
  ],
  "color": "orange",
  "icon": "DocumentTextIcon"
}
```

### 3. Budget Planning Agent

```json
{
  "name": "Budget Planner",
  "description": "Creates and monitors budgets based on historical financial data",
  "prompt": "You are a Budget Planning AI Agent. Your role is to create realistic budgets based on historical data, monitor budget performance, and provide alerts when spending exceeds planned amounts. Always provide specific budget categories and variance analysis.",
  "tools": [
    {"name": "quickbooks_query", "enabled": true},
    {"name": "financial_analysis", "enabled": true},
    {"name": "forecasting", "enabled": true},
    {"name": "data_visualization", "enabled": true}
  ],
  "color": "blue",
  "icon": "CalculatorIcon"
}
```

## 📞 Support & Maintenance

### Support Channels

1. **Documentation**: This deployment guide and API documentation
2. **Issue Tracking**: GitHub Issues for bug reports and feature requests
3. **Community**: Discord/Slack community for user support
4. **Professional Support**: Enterprise support options available

### Maintenance Schedule

- **Daily**: Automated backups and health checks
- **Weekly**: Security updates and log analysis
- **Monthly**: SSL certificate renewal and performance review
- **Quarterly**: Dependency updates and security audit

### Version Updates

```bash
# Update to latest version
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Clear application cache
docker-compose exec redis redis-cli FLUSHALL
```

This deployment guide provides a comprehensive production-ready setup for ERPInsight.ai with custom agent capabilities, security best practices, and scaling options.