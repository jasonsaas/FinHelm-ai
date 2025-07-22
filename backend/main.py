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
from app.core.security import create_access_token, verify_token, hash_password, verify_password, generate_session_token
from app.services.quickbooks_service import QuickBooksService
from app.services.grok_service import GrokService
from app.agents.finance_agent import FinanceAgent

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
    
    # Test Grok API connection
    try:
        grok_service = GrokService()
        health = grok_service.health_check()
        logger.info(f"Grok API status: {health['status']}")
    except Exception as e:
        logger.warning(f"Grok API connection test failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down QuickCauz.ai backend...")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered financial insights and forecasting for QuickBooks Online users",
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

# Security
security = HTTPBearer()

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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), 
                    db: Session = Depends(get_db)) -> models.User:
    """Get current authenticated user"""
    payload = verify_token(credentials.credentials)
    username = payload.get("sub")
    
    if not username:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

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
        
        # Process query with Finance Agent
        finance_agent = FinanceAgent()
        ai_result = finance_agent.process_query(query.message, context)
        
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

# === UTILITY ENDPOINTS ===

@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to QuickCauz.ai API",
        "version": "2.0.0",
        "status": "active",
        "integrations": ["QuickBooks Online", "xAI Grok"]
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        
        # Test Grok API
        grok_service = GrokService()
        grok_health = grok_service.health_check()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "services": {
                "database": "healthy",
                "grok_api": grok_health["status"]
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