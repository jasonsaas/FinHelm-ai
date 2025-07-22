from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import html

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v.strip()

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    qbo_company_name: Optional[str] = None
    qbo_realm_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# QuickBooks OAuth Authentication
class QuickBooksOAuthCallback(BaseModel):
    code: str
    state: str
    realmId: str  # QuickBooks company ID
    
    @validator('code', 'state', 'realmId')
    def validate_oauth_params(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("OAuth parameter cannot be empty")
        return v.strip()

class QuickBooksOAuthURL(BaseModel):
    authorization_url: str
    state: str

class QuickBooksSession(BaseModel):
    session_token: str
    expires_in: int
    company_name: Optional[str] = None
    realm_id: str

# Chat schemas
class ChatMessageCreate(BaseModel):
    content: str
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 5000:
            raise ValueError("Message too long")
        return v.strip()

class ChatMessage(BaseModel):
    id: int
    message_type: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSession(BaseModel):
    id: int
    session_id: str
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool
    messages: List[ChatMessage] = []
    
    class Config:
        from_attributes = True

class ChatQuery(BaseModel):
    message: str
    session_id: Optional[str] = None
    
    @validator('message')
    def validate_message(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 5000:
            raise ValueError("Message too long")
        return v.strip()

class ChatResponse(BaseModel):
    response: str
    session_id: str
    charts: Optional[List[Dict[str, Any]]] = None
    data: Optional[Dict[str, Any]] = None
    financial_insights: Optional[Dict[str, Any]] = None

# QuickBooks Data schemas
class QBAccount(BaseModel):
    Id: str
    Name: str
    AccountType: str
    AccountSubType: Optional[str] = None
    CurrentBalance: Optional[float] = 0.0
    Active: Optional[bool] = True

class QBInvoice(BaseModel):
    Id: str
    DocNumber: Optional[str] = None
    TxnDate: str
    TotalAmt: float
    Balance: Optional[float] = 0.0
    CustomerRef: Optional[Dict[str, str]] = None

class QBItem(BaseModel):
    Id: str
    Name: str
    Type: str
    UnitPrice: Optional[float] = 0.0
    Active: Optional[bool] = True

class QBCompanyInfo(BaseModel):
    CompanyName: str
    LegalName: Optional[str] = None
    CompanyAddr: Optional[Dict[str, Any]] = None
    Country: Optional[str] = None
    FiscalYearStartMonth: Optional[str] = None

# Financial Analysis schemas
class FinancialSummary(BaseModel):
    total_revenue: float
    total_expenses: float
    net_income: float
    total_assets: float
    total_liabilities: float
    period: str
    account_count: int

class DataQuery(BaseModel):
    query_type: str  # 'accounts', 'invoices', 'profit_loss', etc.
    parameters: Optional[Dict[str, Any]] = None
    date_range: Optional[Dict[str, str]] = None

class DataVisualization(BaseModel):
    chart_type: str
    title: str
    data: Dict[str, Any]
    config: Optional[Dict[str, Any]] = None

class AnalysisResult(BaseModel):
    summary: str
    insights: List[str]
    recommendations: List[str]
    visualizations: List[DataVisualization]
    raw_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None

# AI Agent schemas
class AIAgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    agent_type: str
    prompt_template: str
    config: Optional[Dict[str, Any]] = None

class AIAgentCreate(AIAgentBase):
    pass

class AIAgent(AIAgentBase):
    id: int
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Forecasting schemas
class ForecastRequest(BaseModel):
    forecast_type: str  # 'revenue', 'expenses', 'cash_flow'
    periods: int = 12
    period_type: str = "monthly"  # monthly, quarterly, yearly
    include_confidence: bool = True

class ForecastResult(BaseModel):
    forecast_type: str
    periods: int
    forecasted_values: List[Dict[str, Any]]
    confidence_interval: Optional[Dict[str, Any]] = None
    methodology: str
    assumptions: List[str]
    recommendations: List[str]

# API Usage schemas
class APIUsageStats(BaseModel):
    user_id: int
    period: str  # daily, weekly, monthly
    quickbooks_calls: int
    grok_calls: int
    tokens_used: int
    cost_estimate: float