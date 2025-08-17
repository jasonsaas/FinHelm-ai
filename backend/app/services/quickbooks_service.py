import requests
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import logging
import hashlib
import time
from urllib.parse import urlencode, parse_qs
from requests_oauthlib import OAuth2Session
import base64
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from ..core.config import settings

# Try to import Redis for caching
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class QuickBooksService:
    """Enhanced service for interacting with QuickBooks Online API with data reconciliation"""
    
    def __init__(self):
        self.client_id = settings.qbo_client_id
        self.client_secret = settings.qbo_client_secret
        self.redirect_uri = settings.qbo_redirect_uri
        self.scope = settings.qbo_scope
        self.api_base = settings.qbo_api_base
        self.discovery_document = settings.qbo_discovery_document
        
        # OAuth 2.0 endpoints
        self.auth_url = "https://appcenter.intuit.com/connect/oauth2"
        self.token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
        
        # Rate limiting
        self.rate_limit_delay = 1.0  # Seconds between requests
        self.last_request_time = 0
        
        # Initialize cache
        self.cache = None
        self.cache_ttl = 300  # 5 minutes default TTL
        if REDIS_AVAILABLE:
            try:
                self.cache = redis.Redis(
                    host=getattr(settings, 'redis_host', 'localhost'),
                    port=getattr(settings, 'redis_port', 6379),
                    db=getattr(settings, 'redis_db', 0),
                    decode_responses=True
                )
                # Test connection
                self.cache.ping()
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.warning(f"Redis cache initialization failed: {e}")
                self.cache = None
        
        # Data reconciliation tracking
        self.reconciliation_log = {}
        self.data_checksums = {}
    
    def get_authorization_url(self, state: str = None) -> str:
        """Generate OAuth authorization URL for QuickBooks connection"""
        try:
            oauth = OAuth2Session(
                client_id=self.client_id,
                redirect_uri=self.redirect_uri,
                scope=self.scope,
                state=state
            )
            
            authorization_url, state = oauth.authorization_url(self.auth_url)
            logger.info("Generated QuickBooks OAuth authorization URL")
            return authorization_url
            
        except Exception as e:
            logger.error(f"Failed to generate authorization URL: {e}")
            raise
    
    def exchange_code_for_token(self, authorization_code: str, realm_id: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        try:
            # Prepare token request
            auth_header = base64.b64encode(
                f"{self.client_id}:{self.client_secret}".encode()
            ).decode()
            
            headers = {
                'Authorization': f'Basic {auth_header}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'authorization_code',
                'code': authorization_code,
                'redirect_uri': self.redirect_uri
            }
            
            response = requests.post(self.token_url, headers=headers, data=data, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.status_code} - {response.text}")
            
            token_data = response.json()
            
            # Add realm_id to token data
            token_data['realm_id'] = realm_id
            
            logger.info("Successfully exchanged authorization code for access token")
            return token_data
            
        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            raise
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            auth_header = base64.b64encode(
                f"{self.client_id}:{self.client_secret}".encode()
            ).decode()
            
            headers = {
                'Authorization': f'Basic {auth_header}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            }
            
            response = requests.post(self.token_url, headers=headers, data=data, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.status_code} - {response.text}")
            
            token_data = response.json()
            logger.info("Successfully refreshed access token")
            return token_data
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise
    
    def get_company_info(self, access_token: str, realm_id: str) -> Dict[str, Any]:
        """Get company information"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            url = f"{self.api_base}/v3/company/{realm_id}/companyinfo/{realm_id}"
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Company info request failed: {response.status_code} - {response.text}")
            
            data = response.json()
            company_info = data.get('QueryResponse', {}).get('CompanyInfo', [{}])[0]
            
            logger.info("Successfully retrieved company information")
            return company_info
            
        except Exception as e:
            logger.error(f"Failed to get company info: {e}")
            raise
    
    def query_accounts(self, access_token: str, realm_id: str, account_type: str = None) -> List[Dict]:
        """Query chart of accounts"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            # Build query
            query = "SELECT * FROM Account"
            if account_type:
                query += f" WHERE AccountType = '{account_type}'"
            query += " MAXRESULTS 1000"
            
            params = {'query': query}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Accounts query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            accounts = data.get('QueryResponse', {}).get('Account', [])
            
            logger.info(f"Successfully retrieved {len(accounts)} accounts")
            return accounts
            
        except Exception as e:
            logger.error(f"Accounts query failed: {e}")
            raise
    
    def query_items(self, access_token: str, realm_id: str) -> List[Dict]:
        """Query items/products"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            params = {'query': "SELECT * FROM Item MAXRESULTS 1000"}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Items query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            items = data.get('QueryResponse', {}).get('Item', [])
            
            logger.info(f"Successfully retrieved {len(items)} items")
            return items
            
        except Exception as e:
            logger.error(f"Items query failed: {e}")
            raise
    
    def query_invoices(self, access_token: str, realm_id: str, date_from: str = None) -> List[Dict]:
        """Query invoices"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            query = "SELECT * FROM Invoice"
            if date_from:
                query += f" WHERE TxnDate >= '{date_from}'"
            query += " MAXRESULTS 1000"
            
            params = {'query': query}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Invoices query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            invoices = data.get('QueryResponse', {}).get('Invoice', [])
            
            logger.info(f"Successfully retrieved {len(invoices)} invoices")
            return invoices
            
        except Exception as e:
            logger.error(f"Invoices query failed: {e}")
            raise
    
    def get_profit_loss_report(self, access_token: str, realm_id: str, 
                              start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Get Profit & Loss report"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            # Default to current year if no dates provided
            if not start_date:
                start_date = datetime.now().replace(month=1, day=1).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            params = {
                'start_date': start_date,
                'end_date': end_date,
                'qzurl': 'true'
            }
            
            url = f"{self.api_base}/v3/company/{realm_id}/reports/ProfitAndLoss"
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"P&L report failed: {response.status_code} - {response.text}")
            
            data = response.json()
            logger.info("Successfully retrieved Profit & Loss report")
            return data
            
        except Exception as e:
            logger.error(f"P&L report failed: {e}")
            raise
    
    def validate_token(self, access_token: str, realm_id: str) -> bool:
        """Validate if access token is still valid"""
        try:
            self.get_company_info(access_token, realm_id)
            return True
        except Exception as e:
            logger.warning(f"Token validation failed: {e}")
            return False
    
    def _rate_limit(self):
        """Implement rate limiting to respect QuickBooks API limits"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _generate_cache_key(self, endpoint: str, params: Dict = None, realm_id: str = None) -> str:
        """Generate cache key for request"""
        key_parts = [endpoint]
        if realm_id:
            key_parts.append(realm_id)
        if params:
            sorted_params = sorted(params.items())
            key_parts.append(str(sorted_params))
        
        key_string = ":".join(key_parts)
        return f"qb:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    def _get_cached_data(self, cache_key: str) -> Optional[Any]:
        """Get data from cache"""
        if not self.cache:
            return None
        
        try:
            cached_data = self.cache.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {e}")
        
        return None
    
    def _set_cached_data(self, cache_key: str, data: Any, ttl: int = None):
        """Set data in cache"""
        if not self.cache:
            return
        
        try:
            ttl = ttl or self.cache_ttl
            self.cache.setex(cache_key, ttl, json.dumps(data))
        except Exception as e:
            logger.warning(f"Cache storage failed: {e}")
    
    def _calculate_data_checksum(self, data: Any) -> str:
        """Calculate checksum for data integrity verification"""
        data_string = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    def _validate_data_integrity(self, data: List[Dict], data_type: str, realm_id: str) -> Dict[str, Any]:
        """Validate data integrity and detect changes"""
        validation_result = {
            "valid": True,
            "record_count": len(data),
            "checksum": self._calculate_data_checksum(data),
            "timestamp": datetime.now().isoformat(),
            "data_type": data_type,
            "realm_id": realm_id,
            "changes_detected": False,
            "missing_fields": [],
            "schema_errors": []
        }
        
        # Check for previous checksum
        checksum_key = f"{realm_id}:{data_type}"
        previous_checksum = self.data_checksums.get(checksum_key)
        
        if previous_checksum and previous_checksum != validation_result["checksum"]:
            validation_result["changes_detected"] = True
        
        # Store current checksum
        self.data_checksums[checksum_key] = validation_result["checksum"]
        
        # Validate required fields based on data type
        required_fields = self._get_required_fields(data_type)
        
        for record in data[:10]:  # Sample first 10 records
            missing_in_record = [field for field in required_fields if field not in record]
            if missing_in_record:
                validation_result["missing_fields"].extend(missing_in_record)
        
        # Remove duplicates
        validation_result["missing_fields"] = list(set(validation_result["missing_fields"]))
        
        if validation_result["missing_fields"]:
            validation_result["valid"] = False
            logger.warning(f"Data validation failed for {data_type}: missing fields {validation_result['missing_fields']}")
        
        # Log reconciliation status
        self.reconciliation_log[checksum_key] = validation_result
        
        return validation_result
    
    def _get_required_fields(self, data_type: str) -> List[str]:
        """Get required fields for data type validation"""
        required_fields_map = {
            "accounts": ["Id", "Name", "AccountType", "CurrentBalance"],
            "items": ["Id", "Name", "Type"],
            "invoices": ["Id", "TxnDate", "TotalAmt", "Balance"],
            "customers": ["Id", "Name"],
            "vendors": ["Id", "Name"],
            "transactions": ["Id", "TxnDate", "TotalAmt"],
            "companyinfo": ["Id", "CompanyName"]
        }
        
        return required_fields_map.get(data_type, ["Id"])
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((requests.RequestException, requests.Timeout))
    )
    def _make_api_request(self, method: str, url: str, access_token: str, 
                         params: Dict = None, data: Dict = None) -> requests.Response:
        """Make API request with retry logic and rate limiting"""
        self._rate_limit()
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method.upper() == 'POST':
            headers['Content-Type'] = 'application/json'
            response = requests.post(url, headers=headers, json=data, timeout=30)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        if response.status_code == 429:  # Rate limited
            retry_after = int(response.headers.get('Retry-After', 5))
            logger.warning(f"Rate limited, waiting {retry_after} seconds")
            time.sleep(retry_after)
            raise requests.RequestException("Rate limited")
        
        return response
    
    def query_with_reconciliation(self, access_token: str, realm_id: str, 
                                 data_type: str, query_params: Dict = None, 
                                 use_cache: bool = True) -> Dict[str, Any]:
        """Query data with full reconciliation and validation"""
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(f"query_{data_type}", query_params, realm_id)
            
            # Check cache first
            if use_cache:
                cached_data = self._get_cached_data(cache_key)
                if cached_data:
                    logger.info(f"Returning cached data for {data_type}")
                    return {
                        "data": cached_data["data"],
                        "validation": cached_data["validation"],
                        "source": "cache",
                        "timestamp": cached_data["timestamp"]
                    }
            
            # Fetch data based on type
            if data_type == "accounts":
                raw_data = self.query_accounts(access_token, realm_id, 
                                             query_params.get("account_type") if query_params else None)
            elif data_type == "items":
                raw_data = self.query_items(access_token, realm_id)
            elif data_type == "invoices":
                date_from = query_params.get("date_from") if query_params else None
                raw_data = self.query_invoices(access_token, realm_id, date_from)
            elif data_type == "customers":
                raw_data = self.query_customers(access_token, realm_id)
            elif data_type == "vendors":
                raw_data = self.query_vendors(access_token, realm_id)
            else:
                raise ValueError(f"Unsupported data type: {data_type}")
            
            # Validate data integrity
            validation_result = self._validate_data_integrity(raw_data, data_type, realm_id)
            
            # Prepare response
            response_data = {
                "data": raw_data,
                "validation": validation_result,
                "source": "api",
                "timestamp": datetime.now().isoformat(),
                "reconciliation_status": "success" if validation_result["valid"] else "validation_failed"
            }
            
            # Cache the result
            if use_cache and validation_result["valid"]:
                self._set_cached_data(cache_key, response_data)
            
            logger.info(f"Successfully queried {len(raw_data)} {data_type} records with validation")
            return response_data
            
        except Exception as e:
            logger.error(f"Query with reconciliation failed for {data_type}: {e}")
            return {
                "data": [],
                "validation": {"valid": False, "error": str(e)},
                "source": "error",
                "timestamp": datetime.now().isoformat(),
                "reconciliation_status": "failed"
            }
    
    def query_customers(self, access_token: str, realm_id: str) -> List[Dict]:
        """Query customers"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            params = {'query': "SELECT * FROM Customer MAXRESULTS 1000"}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = self._make_api_request('GET', url, access_token, params)
            
            if response.status_code != 200:
                raise Exception(f"Customers query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            customers = data.get('QueryResponse', {}).get('Customer', [])
            
            logger.info(f"Successfully retrieved {len(customers)} customers")
            return customers
            
        except Exception as e:
            logger.error(f"Customers query failed: {e}")
            raise
    
    def query_vendors(self, access_token: str, realm_id: str) -> List[Dict]:
        """Query vendors"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            params = {'query': "SELECT * FROM Vendor MAXRESULTS 1000"}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = self._make_api_request('GET', url, access_token, params)
            
            if response.status_code != 200:
                raise Exception(f"Vendors query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            vendors = data.get('QueryResponse', {}).get('Vendor', [])
            
            logger.info(f"Successfully retrieved {len(vendors)} vendors")
            return vendors
            
        except Exception as e:
            logger.error(f"Vendors query failed: {e}")
            raise
    
    def query_payments(self, access_token: str, realm_id: str, date_from: str = None) -> List[Dict]:
        """Query payments"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            query = "SELECT * FROM Payment"
            if date_from:
                query += f" WHERE TxnDate >= '{date_from}'"
            query += " MAXRESULTS 1000"
            
            params = {'query': query}
            url = f"{self.api_base}/v3/company/{realm_id}/query"
            
            response = self._make_api_request('GET', url, access_token, params)
            
            if response.status_code != 200:
                raise Exception(f"Payments query failed: {response.status_code} - {response.text}")
            
            data = response.json()
            payments = data.get('QueryResponse', {}).get('Payment', [])
            
            logger.info(f"Successfully retrieved {len(payments)} payments")
            return payments
            
        except Exception as e:
            logger.error(f"Payments query failed: {e}")
            raise
    
    def get_reconciliation_status(self, realm_id: str = None) -> Dict[str, Any]:
        """Get reconciliation status for all data types"""
        if realm_id:
            # Filter for specific realm
            realm_logs = {k: v for k, v in self.reconciliation_log.items() if k.startswith(realm_id)}
        else:
            realm_logs = self.reconciliation_log
        
        return {
            "reconciliation_logs": realm_logs,
            "total_data_types": len(realm_logs),
            "valid_count": sum(1 for log in realm_logs.values() if log.get("valid", False)),
            "last_updated": max([log.get("timestamp", "") for log in realm_logs.values()] or [""]),
            "cache_available": self.cache is not None
        }
    
    def clear_cache(self, pattern: str = "qb:*"):
        """Clear cache data"""
        if not self.cache:
            return False
        
        try:
            keys = self.cache.keys(pattern)
            if keys:
                self.cache.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache entries")
            return True
        except Exception as e:
            logger.error(f"Cache clear failed: {e}")
            return False