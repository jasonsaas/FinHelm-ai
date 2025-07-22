from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    """User model for authentication and session management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # QuickBooks connection details
    qbo_company_name = Column(String(255))
    qbo_realm_id = Column(String(50))
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    """User session management for QuickBooks OAuth"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(64), unique=True, index=True, nullable=False)
    
    # QuickBooks OAuth 2.0 tokens
    qbo_access_token = Column(Text)  # Can be long
    qbo_refresh_token = Column(Text)
    qbo_token_expires_at = Column(DateTime(timezone=True))
    qbo_realm_id = Column(String(50))  # Company ID from QB
    qbo_company_name = Column(String(255))
    
    # Session management
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")

class ChatSession(Base):
    """Chat session for AI conversations"""
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="chat_session", cascade="all, delete-orphan")

class ChatMessage(Base):
    """Individual chat messages"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    message_type = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    metadata = Column(JSON)  # Store additional data like charts, QB data sources
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    chat_session = relationship("ChatSession", back_populates="messages")

class QuickBooksData(Base):
    """Cache for QuickBooks data to reduce API calls"""
    __tablename__ = "quickbooks_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    realm_id = Column(String(50), nullable=False)  # QB Company ID
    data_type = Column(String(50), nullable=False)  # 'accounts', 'invoices', 'items', etc.
    data_key = Column(String(255), nullable=False)  # Additional identifier
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Composite index for efficient lookups
    __table_args__ = (
        {"sqlite_autoincrement": True}
    )

class AIAgent(Base):
    """AI Agent configurations for Grok-powered analysis"""
    __tablename__ = "ai_agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    agent_type = Column(String(50), nullable=False)  # 'finance', 'forecasting', 'analysis', etc.
    prompt_template = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System agents vs user-created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Grok-specific configuration
    config = Column(JSON)  # Store Grok model settings, temperature, etc.

class UserPreferences(Base):
    """User preferences and settings"""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    theme = Column(String(20), default="light")
    default_chart_type = Column(String(50), default="bar")
    timezone = Column(String(50), default="UTC")
    
    # QuickBooks preferences
    default_date_range = Column(String(50), default="current_year")  # current_year, last_12_months, etc.
    preferred_reports = Column(JSON)  # List of preferred QuickBooks reports
    
    # AI preferences
    ai_response_style = Column(String(50), default="detailed")  # detailed, concise, technical
    enable_forecasting = Column(Boolean, default=True)
    
    preferences = Column(JSON)  # Additional user preferences
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class APIUsage(Base):
    """Track API usage for rate limiting and analytics"""
    __tablename__ = "api_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    api_type = Column(String(50), nullable=False)  # 'quickbooks', 'grok'
    endpoint = Column(String(255))
    request_count = Column(Integer, default=1)
    tokens_used = Column(Integer, default=0)  # For Grok API
    cost_estimate = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    date = Column(String(10), nullable=False)  # YYYY-MM-DD for daily aggregation