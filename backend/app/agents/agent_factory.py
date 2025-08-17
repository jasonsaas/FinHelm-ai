"""
Agent Factory for creating and managing AI agents in ERPInsight.ai
"""

import logging
from typing import Dict, Any, Optional, Type
from datetime import datetime

from .finance_agent import FinanceAgent
from .sales_agent import SalesAgent  
from .operations_agent import OperationsAgent
from .agent_configs import get_agent_config, route_query_to_agent, validate_agent_request
from ..services.claude_service import ClaudeService
from ..services.rag_service import RAGService
from ..services.quickbooks_service import QuickBooksService

logger = logging.getLogger(__name__)

class AgentFactory:
    """Factory for creating and managing AI agents with enhanced capabilities"""
    
    def __init__(self):
        self.claude_service = ClaudeService()
        self.rag_service = RAGService()
        self.qb_service = QuickBooksService()
        
        # Agent registry
        self.agent_classes = {
            "finance": FinanceAgent,
            "sales": SalesAgent,
            "operations": OperationsAgent
        }
        
        # Agent instance cache
        self.agent_cache = {}
        
    def create_agent(self, agent_id: str, config: Optional[Dict] = None) -> Any:
        """Create an agent instance with configuration"""
        try:
            # Get agent configuration
            agent_config = get_agent_config(agent_id)
            if not agent_config:
                logger.warning(f"No configuration found for agent: {agent_id}")
                agent_config = {}
            
            # Merge with provided config
            if config:
                agent_config.update(config)
            
            # Get agent class
            agent_class = self.agent_classes.get(agent_id)
            if not agent_class:
                logger.error(f"No agent class found for: {agent_id}")
                # Fallback to finance agent
                agent_class = FinanceAgent
                agent_id = "finance"
            
            # Create agent instance
            if agent_id in self.agent_cache:
                logger.info(f"Using cached agent: {agent_id}")
                return self.agent_cache[agent_id]
            
            agent = agent_class(agent_config)
            self.agent_cache[agent_id] = agent
            
            logger.info(f"Created new agent: {agent_id}")
            return agent
            
        except Exception as e:
            logger.error(f"Error creating agent {agent_id}: {e}")
            # Return fallback finance agent
            return FinanceAgent()
    
    def get_best_agent(self, query: str, context: Dict[str, Any] = None) -> Any:
        """Determine and return the best agent for a given query"""
        try:
            # Route query to appropriate agent
            recommended_agent_id = route_query_to_agent(query)
            
            # Validate the routing decision
            validation = validate_agent_request(recommended_agent_id, query)
            
            if validation.get("recommended", True):
                logger.info(f"Routing query to {recommended_agent_id} agent (confidence: {validation.get('confidence', 0):.2f})")
                return self.create_agent(recommended_agent_id)
            else:
                logger.info(f"Low confidence for {recommended_agent_id}, using finance agent as fallback")
                return self.create_agent("finance")
                
        except Exception as e:
            logger.error(f"Error determining best agent: {e}")
            return self.create_agent("finance")
    
    def process_multi_agent_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process query using multiple agents for comprehensive analysis"""
        try:
            results = {}
            agents_to_use = []
            
            # Determine which agents might be relevant
            query_lower = query.lower()
            
            # Check for multi-domain queries
            if any(word in query_lower for word in ["overview", "summary", "all", "complete", "comprehensive"]):
                agents_to_use = ["finance", "sales", "operations"]
            else:
                # Use routing to find primary agent
                primary_agent = route_query_to_agent(query)
                agents_to_use = [primary_agent]
                
                # Add secondary agents based on keywords
                if "customer" in query_lower and primary_agent != "sales":
                    agents_to_use.append("sales")
                if "cost" in query_lower and primary_agent != "operations":
                    agents_to_use.append("operations")
            
            # Process query with each agent
            for agent_id in agents_to_use:
                try:
                    agent = self.create_agent(agent_id)
                    agent_result = agent.process_query(query, context)
                    results[agent_id] = agent_result
                    
                except Exception as e:
                    logger.error(f"Error processing query with {agent_id} agent: {e}")
                    results[agent_id] = {
                        "error": str(e),
                        "response": f"Error processing with {agent_id} agent"
                    }
            
            # Synthesize results if multiple agents were used
            if len(results) > 1:
                synthesized_response = self._synthesize_multi_agent_results(results, query)
                return synthesized_response
            else:
                # Return single agent result
                return list(results.values())[0]
                
        except Exception as e:
            logger.error(f"Error in multi-agent processing: {e}")
            # Fallback to single finance agent
            finance_agent = self.create_agent("finance")
            return finance_agent.process_query(query, context)
    
    def _synthesize_multi_agent_results(self, results: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Synthesize results from multiple agents into a unified response"""
        try:
            # Combine responses
            combined_response = []
            combined_insights = {}
            combined_recommendations = []
            combined_charts = []
            all_financial_data = {}
            
            for agent_id, result in results.items():
                if "error" not in result:
                    # Add agent-specific response
                    agent_response = result.get("response", "")
                    if agent_response:
                        combined_response.append(f"**{agent_id.title()} Analysis:**\n{agent_response}")
                    
                    # Combine insights
                    insights = result.get("insights", {})
                    if insights:
                        combined_insights[f"{agent_id}_insights"] = insights
                    
                    # Combine recommendations
                    recommendations = result.get("recommendations", [])
                    if recommendations:
                        combined_recommendations.extend([
                            f"[{agent_id.title()}] {rec}" for rec in recommendations
                        ])
                    
                    # Combine charts
                    charts = result.get("charts", [])
                    combined_charts.extend(charts)
                    
                    # Combine financial data
                    financial_data = result.get("financial_data", {})
                    all_financial_data.update(financial_data)
            
            # Create synthesized response
            synthesized_text = "\n\n".join(combined_response)
            
            # Use Claude to create a final synthesis
            try:
                synthesis_prompt = f"""
                Based on the following multi-agent analysis results, provide a concise executive summary:
                
                {synthesized_text}
                
                Query: {query}
                
                Please provide a unified summary that highlights the key insights from each agent while avoiding redundancy.
                """
                
                claude_synthesis = self.claude_service.chat_completion(
                    [{"role": "user", "content": synthesis_prompt}],
                    system_prompt="You are an executive assistant synthesizing multi-agent analysis results.",
                    temperature=0.3
                )
                
                final_response = claude_synthesis
                
            except Exception as e:
                logger.warning(f"Claude synthesis failed: {e}")
                final_response = synthesized_text
            
            return {
                "response": final_response,
                "multi_agent_results": results,
                "charts": combined_charts,
                "financial_data": all_financial_data,
                "insights": {
                    "analysis_type": "multi_agent_synthesis",
                    "agents_used": list(results.keys()),
                    "combined_insights": combined_insights
                },
                "recommendations": combined_recommendations[:10]  # Limit to top 10
            }
            
        except Exception as e:
            logger.error(f"Error synthesizing multi-agent results: {e}")
            # Return the first successful result
            for result in results.values():
                if "error" not in result:
                    return result
            
            # Final fallback
            return {
                "response": "Error synthesizing multi-agent results",
                "error": str(e)
            }
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents"""
        status = {
            "active_agents": list(self.agent_cache.keys()),
            "available_agents": list(self.agent_classes.keys()),
            "services_status": {
                "claude": "unknown",
                "rag": "unknown", 
                "quickbooks": "unknown"
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Check service health
        try:
            claude_health = self.claude_service.health_check()
            status["services_status"]["claude"] = claude_health.get("status", "unknown")
        except:
            status["services_status"]["claude"] = "error"
        
        try:
            rag_stats = self.rag_service.get_stats()
            status["services_status"]["rag"] = "healthy" if rag_stats else "error"
        except:
            status["services_status"]["rag"] = "error"
        
        status["services_status"]["quickbooks"] = "available"  # Always available for connections
        
        return status
    
    def clear_agent_cache(self):
        """Clear agent cache"""
        self.agent_cache.clear()
        logger.info("Agent cache cleared")

# Global factory instance
agent_factory = AgentFactory()

def get_agent_factory() -> AgentFactory:
    """Get the global agent factory instance"""
    return agent_factory