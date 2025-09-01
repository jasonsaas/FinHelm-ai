# QuickBooks Online API Error Handling & Token Management Guide

## Overview

This guide provides comprehensive documentation for QuickBooks Online API error handling and OAuth 2.0 token management, covering common error scenarios, best practices for token refresh, and recovery strategies.

## HTTP Status Codes and Error Types

### 400 - Bad Request
**Description**: Request is malformed or contains invalid data
**Common Causes**:
- Missing required fields for entities (e.g., invoice without customer reference)
- Invalid data formats
- Incorrect parameter values
- Malformed JSON payload

**Error Response Format**:
```json
{
  "Fault": {
    "Error": [
      {
        "Detail": "Required parameter customer is missing",
        "code": "400",
        "element": "customer"
      }
    ],
    "type": "ValidationFault"
  }
}
```

**Handling Strategy**:
```python
def handle_400_error(response):
    if response.status_code == 400:
        fault = response.json().get('Fault', {})
        errors = fault.get('Error', [])
        
        for error in errors:
            detail = error.get('Detail')
            code = error.get('code')
            element = error.get('element')
            
            # Log specific validation error
            log_validation_error(detail, code, element)
            
            # Fix missing/invalid data
            return fix_validation_issue(error)
```

### 401 - Unauthorized
**Description**: Authentication failure due to expired or invalid tokens
**Common Causes**:
- Expired access token (valid for 1 hour)
- Invalid authorization header
- Malformed bearer token
- Token not included in request

**Error Response Format**:
```json
{
  "Fault": {
    "Error": [
      {
        "Detail": "Authentication failed",
        "code": "001",
        "element": ""
      }
    ],
    "type": "AuthenticationFault"
  }
}
```

**Handling Strategy**:
```python
def handle_401_error(response):
    # Token likely expired, attempt refresh
    try:
        new_tokens = refresh_access_token()
        # Retry original request with new token
        return retry_with_new_token(new_tokens['access_token'])
    except RefreshTokenExpiredError:
        # Refresh token also expired, require re-authentication
        return redirect_to_oauth_flow()
```

### 403 - Forbidden
**Description**: Authorization issue - user lacks necessary permissions
**Common Causes**:
- Insufficient user permissions
- App not authorized for specific operations
- Company-level restrictions
- User role limitations

**Handling Strategy**:
```python
def handle_403_error(response):
    # Check user permissions
    permissions = get_user_permissions()
    required_permission = get_required_permission_for_operation()
    
    if required_permission not in permissions:
        # Request permission elevation or notify user
        return request_additional_permissions()
```

### 429 - Too Many Requests
**Description**: Rate limit exceeded
**Details**: 
- 500 requests per minute per realm ID
- 10 concurrent requests maximum per realm ID
- 40 batch requests per minute

**Error Response**:
```json
{
  "message": "ThrottleExceeded",
  "errorCode": "003001", 
  "statusCode": 429
}
```

**Handling Strategy**:
```python
import time
import random

def handle_429_error(response, attempt=1, max_retries=5):
    if attempt > max_retries:
        raise MaxRetriesExceededError()
    
    # Exponential backoff with jitter
    delay = (2 ** attempt) + random.uniform(0, 1)
    time.sleep(delay)
    
    # Retry request
    return retry_request(attempt + 1)
```

### 500 - Internal Server Error
**Description**: Server-side error, often related to data encoding
**Common Causes**:
- Non-UTF-8 characters in request payload
- Server-side processing errors
- Database connectivity issues

**Handling Strategy**:
```python
def handle_500_error(request_data):
    # Ensure UTF-8 encoding
    cleaned_data = ensure_utf8_encoding(request_data)
    
    # Retry with cleaned data
    try:
        return retry_request_with_clean_data(cleaned_data)
    except:
        # If still failing, log and queue for later retry
        queue_for_retry(request_data)
```

## Business Logic Error Codes

### Error 120 - Authorization Failure
**Description**: Loss of access to QuickBooks Online
**Causes**:
- User is not an administrator
- Admin status changed
- User profile removed from QuickBooks

### Error 500 - Unsupported Operation
**Description**: Request contains unsupported data or operations
**Common Causes**:
- Non-UTF-8 characters in payload
- Attempting operations on unsupported entities

### Error 610 - Object Not Found
**Description**: Referenced entity does not exist or is inactive
**Causes**:
- Transaction has been deleted
- Referenced object (Customer, Vendor, Account) is inactive

**Prevention Strategy**:
```python
def validate_entity_references(entity_data):
    # Check if referenced entities are active
    customer_ref = entity_data.get('CustomerRef', {}).get('value')
    if customer_ref:
        customer = get_customer(customer_ref)
        if not customer.get('Active', False):
            raise InactiveEntityError(f"Customer {customer_ref} is inactive")
```

### Duplicate DocNumber Errors
**Description**: Occurs when custom transaction numbers are enabled and duplicate checking is active
**Prevention**:
```python
def check_doc_number_uniqueness(doc_number, entity_type):
    # Check preferences first
    preferences = get_company_preferences()
    if preferences.get('CustomTransactionNumbers'):
        # Validate doc_number is unique
        existing = query_by_doc_number(doc_number, entity_type)
        if existing:
            raise DuplicateDocNumberError(f"DocNumber {doc_number} already exists")
```

## OAuth 2.0 Token Management

### Token Lifecycle
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 100 days (rolling expiration)
- **Refresh Token Cycling**: New refresh token issued every 24 hours

### Token Storage Best Practices

```python
class TokenManager:
    def __init__(self):
        self.tokens = {}
    
    def store_tokens(self, realm_id, access_token, refresh_token, expires_in):
        """Store tokens with expiration tracking"""
        expiry_time = datetime.now() + timedelta(seconds=expires_in)
        
        self.tokens[realm_id] = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_at': expiry_time,
            'refresh_token_expires_at': datetime.now() + timedelta(days=100)
        }
    
    def get_valid_access_token(self, realm_id):
        """Get valid access token, refresh if needed"""
        token_data = self.tokens.get(realm_id)
        if not token_data:
            raise TokenNotFoundError()
        
        # Check if access token is expired or will expire soon
        if token_data['expires_at'] <= datetime.now() + timedelta(minutes=5):
            return self.refresh_access_token(realm_id)
        
        return token_data['access_token']
    
    def refresh_access_token(self, realm_id):
        """Refresh access token using refresh token"""
        token_data = self.tokens.get(realm_id)
        if not token_data:
            raise TokenNotFoundError()
        
        # Check refresh token expiry
        if token_data['refresh_token_expires_at'] <= datetime.now():
            raise RefreshTokenExpiredError()
        
        # Make refresh request
        new_tokens = make_token_refresh_request(token_data['refresh_token'])
        
        # Always store new refresh token (it may have changed)
        self.store_tokens(
            realm_id,
            new_tokens['access_token'],
            new_tokens['refresh_token'],  # This might be a new value
            new_tokens['expires_in']
        )
        
        return new_tokens['access_token']
```

### Token Refresh Implementation

```python
import requests

def make_token_refresh_request(refresh_token):
    """Make token refresh API call"""
    url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': f'Basic {get_basic_auth_header()}'  # Base64(client_id:client_secret)
    }
    
    data = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 400:
        error = response.json().get('error')
        if error == 'invalid_grant':
            raise RefreshTokenExpiredError("Refresh token has expired")
        else:
            raise TokenRefreshError(f"Token refresh failed: {error}")
    else:
        raise TokenRefreshError(f"Unexpected error: {response.status_code}")
```

### Proactive Token Management

```python
class ProactiveTokenManager:
    def __init__(self):
        self.token_manager = TokenManager()
        self.scheduler = BackgroundScheduler()
        self.start_scheduler()
    
    def start_scheduler(self):
        """Start background token refresh scheduler"""
        # Check for tokens expiring in next hour every 30 minutes
        self.scheduler.add_job(
            func=self.refresh_expiring_tokens,
            trigger="interval",
            minutes=30
        )
        self.scheduler.start()
    
    def refresh_expiring_tokens(self):
        """Proactively refresh tokens that will expire soon"""
        cutoff_time = datetime.now() + timedelta(minutes=30)
        
        for realm_id, token_data in self.token_manager.tokens.items():
            if token_data['expires_at'] <= cutoff_time:
                try:
                    self.token_manager.refresh_access_token(realm_id)
                except RefreshTokenExpiredError:
                    # Notify that re-authentication is needed
                    self.notify_reauth_required(realm_id)
```

### Multi-Company Token Management

```python
class MultiCompanyTokenManager:
    def __init__(self):
        self.company_tokens = {}  # realm_id -> token_data
        self.user_companies = {}  # user_id -> [realm_ids]
    
    def associate_user_with_company(self, user_id, realm_id):
        """Associate user with company for token management"""
        if user_id not in self.user_companies:
            self.user_companies[user_id] = []
        
        if realm_id not in self.user_companies[user_id]:
            self.user_companies[user_id].append(realm_id)
    
    def get_user_companies(self, user_id):
        """Get all companies accessible by user"""
        realm_ids = self.user_companies.get(user_id, [])
        return [
            {
                'realm_id': realm_id,
                'has_valid_token': self.has_valid_token(realm_id)
            }
            for realm_id in realm_ids
        ]
    
    def refresh_all_user_tokens(self, user_id):
        """Refresh tokens for all user's companies"""
        realm_ids = self.user_companies.get(user_id, [])
        results = {}
        
        for realm_id in realm_ids:
            try:
                self.token_manager.refresh_access_token(realm_id)
                results[realm_id] = 'success'
            except RefreshTokenExpiredError:
                results[realm_id] = 'expired'
            except Exception as e:
                results[realm_id] = f'error: {str(e)}'
        
        return results
```

## Error Recovery Patterns

### Retry with Exponential Backoff

```python
class APIRetryManager:
    def __init__(self, max_retries=3):
        self.max_retries = max_retries
    
    def execute_with_retry(self, func, *args, **kwargs):
        """Execute API call with retry logic"""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            
            except TokenExpiredError:
                # Handle token refresh
                if attempt == self.max_retries:
                    raise
                self.refresh_token_and_retry()
            
            except RateLimitError as e:
                # Handle rate limiting
                if attempt == self.max_retries:
                    raise
                self.handle_rate_limit(attempt)
                last_exception = e
            
            except ValidationError as e:
                # Don't retry validation errors
                raise
            
            except ServerError as e:
                # Retry server errors with backoff
                if attempt == self.max_retries:
                    raise
                self.wait_for_retry(attempt)
                last_exception = e
        
        raise last_exception
    
    def wait_for_retry(self, attempt):
        """Exponential backoff with jitter"""
        base_delay = 2 ** attempt
        jitter = random.uniform(0.1, 0.5)
        delay = base_delay + jitter
        time.sleep(delay)
```

### Circuit Breaker Pattern

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        if self.state == 'OPEN':
            if self._should_try_reset():
                self.state = 'HALF_OPEN'
            else:
                raise CircuitBreakerOpenError()
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        self.state = 'CLOSED'
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
    
    def _should_try_reset(self):
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
```

## Security Best Practices

### Secure Token Storage
```python
from cryptography.fernet import Fernet

class SecureTokenStorage:
    def __init__(self, encryption_key):
        self.cipher_suite = Fernet(encryption_key)
    
    def store_token(self, realm_id, token_data):
        """Store encrypted token data"""
        encrypted_data = self.cipher_suite.encrypt(
            json.dumps(token_data).encode()
        )
        # Store encrypted_data in secure database
        self.db.store_encrypted_token(realm_id, encrypted_data)
    
    def retrieve_token(self, realm_id):
        """Retrieve and decrypt token data"""
        encrypted_data = self.db.get_encrypted_token(realm_id)
        if encrypted_data:
            decrypted_data = self.cipher_suite.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
        return None
```

### Token Revocation
```python
def revoke_tokens(realm_id, refresh_token):
    """Revoke tokens when user disconnects"""
    revoke_url = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': f'Basic {get_basic_auth_header()}'
    }
    
    data = {'token': refresh_token}
    
    response = requests.post(revoke_url, headers=headers, data=data)
    
    if response.status_code == 200:
        # Clean up local token storage
        delete_stored_tokens(realm_id)
        return True
    else:
        raise TokenRevocationError(f"Failed to revoke token: {response.status_code}")
```

## Monitoring and Alerting

### Error Tracking
```python
class APIErrorTracker:
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.recent_errors = []
    
    def track_error(self, error_type, error_detail, realm_id=None):
        """Track API errors for monitoring"""
        self.error_counts[error_type] += 1
        
        error_record = {
            'timestamp': datetime.now(),
            'error_type': error_type,
            'error_detail': error_detail,
            'realm_id': realm_id
        }
        
        self.recent_errors.append(error_record)
        
        # Keep only recent errors (last 1000)
        if len(self.recent_errors) > 1000:
            self.recent_errors = self.recent_errors[-1000:]
        
        # Alert if error rate is high
        if self._should_alert(error_type):
            self.send_alert(error_type, error_record)
    
    def _should_alert(self, error_type):
        recent_errors = [
            e for e in self.recent_errors 
            if e['error_type'] == error_type 
            and e['timestamp'] > datetime.now() - timedelta(minutes=10)
        ]
        return len(recent_errors) > 10  # Alert if more than 10 errors in 10 minutes
```

This comprehensive guide covers the essential aspects of QuickBooks API error handling and token management, providing practical code examples and best practices for building robust integrations.