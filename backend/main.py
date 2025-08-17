from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
from contextlib import asynccontextmanager
import secrets
from urllib.parse import parse_qs

from app.core.config import settings
from app.db.database import engine, get_db
from app.db import models, schemas
from app.core.security import create_access_token, verify_token, hash_password, verify_password, generate_session_token, get_current_user
from app.services.quickbooks_service import QuickBooksService
from app.services.claude_service import ClaudeService
from app.services.rag_service import RAGService
from app.agents.finance_agent import FinanceAgent
from app.agents.sales_agent import SalesAgent
from app.agents.operations_agent import OperationsAgent
from app.api import agents

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Starting QuickCauz.ai backend...")
    
    # Create database tables
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Test Claude API connection
    try:
        claude_service = ClaudeService()
        health = claude_service.health_check()
        logger.info(f"Claude API status: {health['status']}")
    except Exception as e:
        logger.warning(f"Claude API connection test failed: {e}")
    
    # Initialize RAG service
    try:
        global rag_service
        rag_service = RAGService()
        logger.info("RAG service initialized successfully")
    except Exception as e:
        logger.warning(f"RAG service initialization failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ERPInsight.ai backend...")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered ERP insights and chatbots for QuickBooks Online users",
    version="2.0.0",
    debug=settings.debug,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])

# === AUTHENTICATION ENDPOINTS ===

@app.post("/auth/register", response_model=schemas.Token)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(
            (models.User.email == user_data.email) | 
            (models.User.username == user_data.username)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="User with this email or username already exists"
            )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        db_user = models.User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": db_user.username})
        
        logger.info(f"User registered successfully: {user_data.username}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": db_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/auth/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return token"""
    try:
        # Find user
        user = db.query(models.User).filter(
            models.User.username == user_data.username
        ).first()
        
        if not user or not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Create access token
        access_token = create_access_token(data={"sub": user.username})
        
        logger.info(f"User logged in successfully: {user_data.username}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# === QUICKBOOKS OAUTH ENDPOINTS ===

@app.get("/auth/quickbooks/oauth-url")
def get_quickbooks_oauth_url(current_user: models.User = Depends(get_current_user)):
    """Get QuickBooks OAuth authorization URL"""
    try:
        # Generate state parameter for security
        state = generate_session_token()[:16]
        
        qb_service = QuickBooksService()
        auth_url = qb_service.get_authorization_url(state=state)
        
        logger.info(f"Generated QuickBooks OAuth URL for user: {current_user.username}")
        
        return {
            "authorization_url": auth_url,
            "state": state
        }
        
    except Exception as e:
        logger.error(f"QuickBooks OAuth URL generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate OAuth URL")

@app.post("/auth/quickbooks/callback", response_model=schemas.QuickBooksSession)
def handle_quickbooks_oauth_callback(
    oauth_callback: schemas.QuickBooksOAuthCallback,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle OAuth callback from QuickBooks"""
    try:
        # Exchange authorization code for access token
        qb_service = QuickBooksService()
        token_response = qb_service.exchange_code_for_token(
            oauth_callback.code, 
            oauth_callback.realmId
        )
        
        # Get company information
        company_info = qb_service.get_company_info(
            token_response["access_token"], 
            oauth_callback.realmId
        )
        company_name = company_info.get("CompanyName", "Unknown Company")
        
        # Create user session with OAuth tokens
        session_token = generate_session_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Remove existing active sessions for this user
        db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True
        ).update({"is_active": False})
        
        # Create new session with QuickBooks tokens
        user_session = models.UserSession(
            user_id=current_user.id,
            session_token=session_token,
            qbo_access_token=token_response["access_token"],
            qbo_refresh_token=token_response.get("refresh_token"),
            qbo_token_expires_at=datetime.utcnow() + timedelta(
                seconds=token_response.get("expires_in", 3600)
            ),
            qbo_realm_id=oauth_callback.realmId,
            qbo_company_name=company_name,
            expires_at=expires_at
        )
        
        db.add(user_session)
        
        # Update user's QuickBooks details
        current_user.qbo_company_name = company_name
        current_user.qbo_realm_id = oauth_callback.realmId
        
        db.commit()
        
        logger.info(f"QuickBooks OAuth successful for user: {current_user.username}, company: {company_name}")
        
        return {
            "session_token": session_token,
            "expires_in": 3600,
            "company_name": company_name,
            "realm_id": oauth_callback.realmId
        }
        
    except Exception as e:
        logger.error(f"QuickBooks OAuth callback error: {e}")
        raise HTTPException(status_code=401, detail="QuickBooks authentication failed")

# === CHAT ENDPOINTS ===

@app.post("/chat/sessions", response_model=schemas.ChatSession)
def create_chat_session(
    session_data: schemas.ChatSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session"""
    try:
        session_id = generate_session_token()
        
        chat_session = models.ChatSession(
            user_id=current_user.id,
            session_id=session_id,
            title=session_data.title or "New Chat"
        )
        
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
        
        logger.info(f"Created chat session for user {current_user.username}: {session_id}")
        
        return chat_session
        
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session")

@app.get("/chat/sessions")
def get_chat_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's chat sessions"""
    try:
        sessions = db.query(models.ChatSession).filter(
            models.ChatSession.user_id == current_user.id,
            models.ChatSession.is_active == True
        ).order_by(models.ChatSession.updated_at.desc()).all()
        
        return sessions
        
    except Exception as e:
        logger.error(f"Error fetching chat sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat sessions")

@app.post("/chat/query", response_model=schemas.ChatResponse)
def process_chat_query(
    query: schemas.ChatQuery,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a chat query with AI agent"""
    try:
        # Get or create chat session
        if query.session_id:
            chat_session = db.query(models.ChatSession).filter(
                models.ChatSession.session_id == query.session_id,
                models.ChatSession.user_id == current_user.id,
                models.ChatSession.is_active == True
            ).first()
            
            if not chat_session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        else:
            # Create new session
            session_id = generate_session_token()
            chat_session = models.ChatSession(
                user_id=current_user.id,
                session_id=session_id,
                title=query.message[:50] + "..." if len(query.message) > 50 else query.message
            )
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)
        
        # Get active QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            raise HTTPException(
                status_code=401,
                detail="No active QuickBooks session. Please connect to QuickBooks first."
            )
        
        # Check if QuickBooks token needs refresh
        if (qb_session.qbo_token_expires_at and 
            qb_session.qbo_token_expires_at <= datetime.utcnow() and
            qb_session.qbo_refresh_token):
            
            try:
                qb_service = QuickBooksService()
                token_response = qb_service.refresh_access_token(qb_session.qbo_refresh_token)
                
                # Update session with new tokens
                qb_session.qbo_access_token = token_response["access_token"]
                if "refresh_token" in token_response:
                    qb_session.qbo_refresh_token = token_response["refresh_token"]
                qb_session.qbo_token_expires_at = datetime.utcnow() + timedelta(
                    seconds=token_response.get("expires_in", 3600)
                )
                db.commit()
                
                logger.info(f"Refreshed QuickBooks token for user {current_user.username}")
                
            except Exception as e:
                logger.error(f"Failed to refresh QuickBooks token: {e}")
                raise HTTPException(
                    status_code=401,
                    detail="QuickBooks session expired. Please re-authenticate."
                )
        
        # Save user message
        user_message = models.ChatMessage(
            chat_session_id=chat_session.id,
            message_type="user",
            content=query.message
        )
        db.add(user_message)
        
        # Prepare context for AI agent
        context = {
            "access_token": qb_session.qbo_access_token,
            "realm_id": qb_session.qbo_realm_id,
            "company_name": qb_session.qbo_company_name,
            "user_id": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine which agent to use based on query or explicit agent type
        agent_type = getattr(query, 'agent_type', 'finance')  # Default to finance
        
        if agent_type == 'sales':
            agent = SalesAgent()
        elif agent_type == 'operations':
            agent = OperationsAgent()
        else:
            agent = FinanceAgent()
        
        # Process query with selected agent
        ai_result = agent.process_query(query.message, context)
        
        # Save AI response
        ai_message = models.ChatMessage(
            chat_session_id=chat_session.id,
            message_type="assistant",
            content=ai_result.get("response", "I couldn't process your request."),
            metadata={
                "charts": ai_result.get("charts", []),
                "insights": ai_result.get("insights", {}),
                "data_sources": ai_result.get("insights", {}).get("data_sources", []),
                "recommendations": ai_result.get("recommendations", [])
            }
        )
        db.add(ai_message)
        
        # Update chat session timestamp
        chat_session.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Processed chat query for user {current_user.username}")
        
        return {
            "response": ai_result.get("response", "I couldn't process your request."),
            "session_id": chat_session.session_id,
            "charts": ai_result.get("charts", []),
            "data": ai_result.get("financial_data", {}),
            "financial_insights": ai_result.get("insights", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat query: {e}")
        raise HTTPException(status_code=500, detail="Failed to process your query. Please try again.")

# === AGENT MANAGEMENT ENDPOINTS ===

@app.get("/agents/list")
def list_available_agents(current_user: models.User = Depends(get_current_user)):
    """List all available AI agents"""
    agents = [
        {
            "id": "finance",
            "name": "Finance Agent",
            "description": "Specialized in financial analysis, forecasting, and budget insights",
            "capabilities": [
                "Cash flow analysis", 
                "Profit & loss analysis", 
                "Budget variance explanations",
                "Financial forecasting",
                "Key performance indicators"
            ],
            "icon": "💰"
        },
        {
            "id": "sales",
            "name": "Sales Agent", 
            "description": "Focused on sales performance, customer analysis, and revenue optimization",
            "capabilities": [
                "Sales trend analysis",
                "Customer segmentation", 
                "Revenue forecasting",
                "Performance metrics",
                "Growth strategies"
            ],
            "icon": "📈"
        },
        {
            "id": "operations",
            "name": "Operations Agent",
            "description": "Optimizes business operations, inventory, and vendor management",
            "capabilities": [
                "Expense analysis",
                "Inventory optimization",
                "Vendor performance", 
                "Process efficiency",
                "Cost reduction strategies"
            ],
            "icon": "⚙️"
        }
    ]
    
    return {"agents": agents}

@app.post("/agents/{agent_id}/chat", response_model=schemas.ChatResponse)
def chat_with_specific_agent(
    agent_id: str,
    query: schemas.ChatQuery,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with a specific agent"""
    if agent_id not in ['finance', 'sales', 'operations']:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    # Update query with agent type
    query.agent_type = agent_id
    
    # Use existing chat query processing
    return process_chat_query(query, current_user, db)

@app.get("/agents/recommendations")
def get_agent_recommendations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized agent recommendations based on user's data"""
    try:
        # Get user's QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            return {
                "recommendations": [
                    {
                        "agent_id": "finance",
                        "priority": "high",
                        "reason": "Connect to QuickBooks to get personalized recommendations"
                    }
                ]
            }
        
        # Basic recommendations based on common business needs
        recommendations = [
            {
                "agent_id": "finance",
                "priority": "high",
                "reason": "Review your cash flow and financial performance",
                "suggested_questions": [
                    "What's my current cash flow status?",
                    "Show me my profit and loss trends",
                    "What are my biggest expenses this month?"
                ]
            },
            {
                "agent_id": "sales",
                "priority": "medium", 
                "reason": "Analyze your sales performance and growth opportunities",
                "suggested_questions": [
                    "Who are my top customers by revenue?",
                    "What's my monthly sales growth rate?",
                    "Which products/services are performing best?"
                ]
            },
            {
                "agent_id": "operations",
                "priority": "medium",
                "reason": "Optimize your business operations and reduce costs",
                "suggested_questions": [
                    "What are my biggest expense categories?",
                    "Which vendors am I spending the most with?",
                    "Do I have any low inventory items?"
                ]
            }
        ]
        
        return {"recommendations": recommendations}
        
    except Exception as e:
        logger.error(f"Error getting agent recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations")

# === QUICKBOOKS DATA ENDPOINTS ===

@app.get("/api/quickbooks/reconciliation-status")
def get_quickbooks_reconciliation_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get QuickBooks data reconciliation status"""
    try:
        # Get active QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            raise HTTPException(
                status_code=401,
                detail="No active QuickBooks session"
            )
        
        qb_service = QuickBooksService()
        reconciliation_status = qb_service.get_reconciliation_status(qb_session.qbo_realm_id)
        
        return {
            "company_name": qb_session.qbo_company_name,
            "realm_id": qb_session.qbo_realm_id,
            "reconciliation_status": reconciliation_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reconciliation status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get reconciliation status")

@app.post("/api/quickbooks/sync-data")
def sync_quickbooks_data(
    sync_request: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync and validate QuickBooks data with reconciliation"""
    try:
        # Get active QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            raise HTTPException(
                status_code=401,
                detail="No active QuickBooks session"
            )
        
        qb_service = QuickBooksService()
        
        # Get requested data types (default to all)
        data_types = sync_request.get("data_types", ["accounts", "invoices", "customers", "items"])
        use_cache = sync_request.get("use_cache", True)
        
        sync_results = {}
        
        for data_type in data_types:
            try:
                result = qb_service.query_with_reconciliation(
                    qb_session.qbo_access_token,
                    qb_session.qbo_realm_id,
                    data_type,
                    use_cache=use_cache
                )
                sync_results[data_type] = {
                    "status": result["reconciliation_status"],
                    "record_count": len(result["data"]),
                    "validation": result["validation"],
                    "source": result["source"]
                }
                
            except Exception as e:
                sync_results[data_type] = {
                    "status": "failed",
                    "error": str(e)
                }
        
        logger.info(f"Data sync completed for user {current_user.username}")
        
        return {
            "sync_results": sync_results,
            "timestamp": datetime.now().isoformat(),
            "company_name": qb_session.qbo_company_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data sync error: {e}")
        raise HTTPException(status_code=500, detail="Data sync failed")

@app.get("/api/quickbooks/data/{data_type}")
def get_quickbooks_data(
    data_type: str,
    use_cache: bool = True,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific QuickBooks data type with validation"""
    try:
        if data_type not in ["accounts", "invoices", "customers", "vendors", "items", "payments"]:
            raise HTTPException(status_code=400, detail="Invalid data type")
        
        # Get active QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            raise HTTPException(
                status_code=401,
                detail="No active QuickBooks session"
            )
        
        qb_service = QuickBooksService()
        result = qb_service.query_with_reconciliation(
            qb_session.qbo_access_token,
            qb_session.qbo_realm_id,
            data_type,
            use_cache=use_cache
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting {data_type} data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get {data_type} data")

@app.delete("/api/quickbooks/cache")
def clear_quickbooks_cache(
    current_user: models.User = Depends(get_current_user)
):
    """Clear QuickBooks cache"""
    try:
        qb_service = QuickBooksService()
        success = qb_service.clear_cache()
        
        if success:
            return {"message": "Cache cleared successfully"}
        else:
            return {"message": "Cache not available or clear failed"}
            
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

# === UTILITY ENDPOINTS ===

@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to ERPInsight.ai API",
        "version": "2.0.0",
        "status": "active",
        "integrations": ["QuickBooks Online", "Anthropic Claude", "Vector Search"]
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        
        # Test Claude API
        claude_service = ClaudeService()
        claude_health = claude_service.health_check()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "services": {
                "database": "healthy",
                "claude_api": claude_health["status"],
                "rag_service": "healthy" if 'rag_service' in globals() else "not_initialized"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.post("/forecast")
def generate_forecast(
    forecast_request: schemas.ForecastRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate financial forecast"""
    try:
        # Get active QuickBooks session
        qb_session = db.query(models.UserSession).filter(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not qb_session:
            raise HTTPException(
                status_code=401,
                detail="QuickBooks connection required for forecasting"
            )
        
        # Generate forecast using Finance Agent
        finance_agent = FinanceAgent()
        forecast_result = finance_agent.generate_forecast(
            qb_session.qbo_access_token,
            qb_session.qbo_realm_id,
            forecast_request.forecast_type,
            forecast_request.periods
        )
        
        logger.info(f"Generated {forecast_request.forecast_type} forecast for user {current_user.username}")
        
        return forecast_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate forecast")

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc} - {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )