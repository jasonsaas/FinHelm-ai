from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Application
    app_name: str = "ERPInsight.ai"
    debug: bool = True
    log_level: str = "INFO"
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    # Database
    database_url: str = "sqlite:///./erpinsight.db"
    
    # QuickBooks Online OAuth 2.0
    qbo_client_id: str
    qbo_client_secret: str
    qbo_environment: str = "sandbox"  # "sandbox" or "production"
    qbo_redirect_uri: str = "http://localhost:3000/auth/quickbooks/callback"
    qbo_scope: str = "com.intuit.quickbooks.accounting"
    qbo_api_base: str = "https://sandbox-quickbooks.api.intuit.com"
    qbo_discovery_document: str = "https://appcenter.intuit.com/api/v1/OpenID_sandbox"
    
    # Anthropic Claude Configuration
    anthropic_api_key: str
    claude_model: str = "claude-3-5-sonnet-20241022"
    claude_max_tokens: int = 4000
    claude_temperature: float = 0.7
    
    # xAI Grok Configuration
    grok_api_key: str = "your_grok_api_key_here"
    grok_api_base: str = "https://api.x.ai/v1"
    grok_model: str = "grok-beta"
    grok_max_tokens: int = 2000
    grok_temperature: float = 0.7
    
    # Vector Store Configuration
    vector_db_path: str = "data/vectors"
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://localhost:3000"
    ]
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()