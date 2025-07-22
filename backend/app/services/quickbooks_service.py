import requests
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
from urllib.parse import urlencode, parse_qs
from requests_oauthlib import OAuth2Session
import base64
from ..core.config import settings

logger = logging.getLogger(__name__)

class QuickBooksService:
    """Service for interacting with QuickBooks Online API"""
    
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