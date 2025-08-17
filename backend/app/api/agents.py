from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid
from datetime import datetime

from ..db.database import get_db
from ..db.models import CustomAgent, User
from ..db.schemas import CustomAgentCreate, CustomAgentResponse, CustomAgentUpdate
from ..core.security import get_current_user
from ..services.claude_service import ClaudeService

router = APIRouter()

@router.get("/recommendations", response_model=dict)
async def get_agent_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI agent recommendations based on user's business data"""
    try:
        # For now, return static recommendations
        # In production, this would analyze user's QuickBooks data
        recommendations = {
            "suggested_agents": [
                {
                    "type": "finance",
                    "title": "Cash Flow Monitor",
                    "description": "Track cash flow patterns and predict potential shortfalls",
                    "priority": "high",
                    "reason": "Your cash flow has shown volatility in the past 3 months"
                },
                {
                    "type": "sales",
                    "title": "Customer Retention Analyst",
                    "description": "Identify at-risk customers and suggest retention strategies",
                    "priority": "medium",
                    "reason": "Customer acquisition cost has increased 15% recently"
                },
                {
                    "type": "operations",
                    "title": "Expense Optimizer",
                    "description": "Find opportunities to reduce operational expenses",
                    "priority": "medium",
                    "reason": "Operating expenses are above industry average"
                }
            ],
            "usage_stats": {
                "total_queries": 0,
                "most_used_agent": "finance",
                "avg_response_time": "2.3s"
            }
        }
        
        return recommendations
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommendations: {str(e)}"
        )

@router.get("/custom", response_model=List[CustomAgentResponse])
async def get_custom_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all custom agents for the current user"""
    try:
        agents = db.query(CustomAgent).filter(
            CustomAgent.user_id == current_user.id
        ).order_by(CustomAgent.created_at.desc()).all()
        
        return agents
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get custom agents: {str(e)}"
        )

@router.post("/custom", response_model=CustomAgentResponse)
async def create_custom_agent(
    agent_data: CustomAgentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom agent"""
    try:
        # Check if agent name already exists for this user
        existing_agent = db.query(CustomAgent).filter(
            CustomAgent.user_id == current_user.id,
            CustomAgent.name == agent_data.name
        ).first()
        
        if existing_agent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An agent with this name already exists"
            )
        
        # Create new custom agent
        db_agent = CustomAgent(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            name=agent_data.name,
            description=agent_data.description,
            system_prompt=agent_data.prompt,
            tools=json.dumps([tool.dict() for tool in agent_data.tools]),
            color=agent_data.color,
            icon=agent_data.icon,
            is_active=True
        )
        
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)
        
        return db_agent
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custom agent: {str(e)}"
        )

@router.put("/custom/{agent_id}", response_model=CustomAgentResponse)
async def update_custom_agent(
    agent_id: str,
    agent_data: CustomAgentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing custom agent"""
    try:
        # Get the agent
        db_agent = db.query(CustomAgent).filter(
            CustomAgent.id == agent_id,
            CustomAgent.user_id == current_user.id
        ).first()
        
        if not db_agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Check if new name conflicts with existing agents (excluding current)
        if agent_data.name and agent_data.name != db_agent.name:
            existing_agent = db.query(CustomAgent).filter(
                CustomAgent.user_id == current_user.id,
                CustomAgent.name == agent_data.name,
                CustomAgent.id != agent_id
            ).first()
            
            if existing_agent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An agent with this name already exists"
                )
        
        # Update agent fields
        update_data = agent_data.dict(exclude_unset=True)
        
        if 'name' in update_data:
            db_agent.name = update_data['name']
        if 'description' in update_data:
            db_agent.description = update_data['description']
        if 'prompt' in update_data:
            db_agent.system_prompt = update_data['prompt']
        if 'tools' in update_data:
            db_agent.tools = json.dumps([tool.dict() for tool in update_data['tools']])
        if 'color' in update_data:
            db_agent.color = update_data['color']
        if 'icon' in update_data:
            db_agent.icon = update_data['icon']
        
        db_agent.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_agent)
        
        return db_agent
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update custom agent: {str(e)}"
        )

@router.delete("/custom/{agent_id}")
async def delete_custom_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom agent"""
    try:
        # Get the agent
        db_agent = db.query(CustomAgent).filter(
            CustomAgent.id == agent_id,
            CustomAgent.user_id == current_user.id
        ).first()
        
        if not db_agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Delete the agent
        db.delete(db_agent)
        db.commit()
        
        return {"message": "Agent deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete custom agent: {str(e)}"
        )

@router.post("/test")
async def test_agent(
    test_data: dict,
    current_user: User = Depends(get_current_user),
    claude_service: ClaudeService = Depends(lambda: ClaudeService())
):
    """Test a custom agent with a sample query"""
    try:
        agent_config = test_data.get("agent")
        query = test_data.get("query", "Give me a brief overview of my business performance.")
        
        if not agent_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent configuration is required"
            )
        
        # Simulate agent response using Claude service
        system_prompt = agent_config.get("prompt", "You are a helpful business assistant.")
        enabled_tools = [
            tool["name"] for tool in agent_config.get("tools", []) 
            if tool.get("enabled", False)
        ]
        
        # Create a test context
        test_context = {
            "agent_name": agent_config.get("name", "Test Agent"),
            "tools": enabled_tools,
            "user_query": query
        }
        
        # Generate test response
        response = await claude_service.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"This is a test. Please respond as {agent_config.get('name')} would to this query: {query}"}
            ]
        )
        
        return {
            "success": True,
            "response": response.get("content", "Test response generated successfully."),
            "agent_name": agent_config.get("name"),
            "tools_used": enabled_tools[:3],  # Limit to first 3 tools for demo
            "test_query": query
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test agent: {str(e)}"
        )

@router.get("/custom/{agent_id}", response_model=CustomAgentResponse)
async def get_custom_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific custom agent by ID"""
    try:
        agent = db.query(CustomAgent).filter(
            CustomAgent.id == agent_id,
            CustomAgent.user_id == current_user.id
        ).first()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return agent
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get custom agent: {str(e)}"
        )

@router.post("/custom/{agent_id}/activate")
async def activate_custom_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a custom agent"""
    try:
        agent = db.query(CustomAgent).filter(
            CustomAgent.id == agent_id,
            CustomAgent.user_id == current_user.id
        ).first()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Toggle active status
        agent.is_active = not agent.is_active
        agent.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(agent)
        
        return {
            "message": f"Agent {'activated' if agent.is_active else 'deactivated'} successfully",
            "is_active": agent.is_active
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle agent status: {str(e)}"
        )