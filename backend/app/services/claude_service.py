import anthropic
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from ..core.config import settings

logger = logging.getLogger(__name__)

class ClaudeService:
    """Service for interacting with Anthropic's Claude API"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.claude_max_tokens
        self.temperature = settings.claude_temperature
    
    def chat_completion(self, messages: List[Dict[str, str]], 
                       system_prompt: str = "",
                       temperature: Optional[float] = None,
                       max_tokens: Optional[int] = None) -> str:
        """Generate chat completion using Claude"""
        try:
            # Convert messages to Claude format
            claude_messages = []
            for msg in messages:
                if msg["role"] != "system":  # Claude handles system separately
                    claude_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            
            # Create the message
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens or self.max_tokens,
                temperature=temperature or self.temperature,
                system=system_prompt,
                messages=claude_messages
            )
            
            # Extract the response content
            if response.content and len(response.content) > 0:
                content = response.content[0].text
                
                # Log token usage
                logger.info(f"Claude API usage - input: {response.usage.input_tokens}, "
                          f"output: {response.usage.output_tokens}")
                
                return content.strip()
            else:
                raise Exception("No response content from Claude API")
                
        except Exception as e:
            logger.error(f"Claude chat completion failed: {e}")
            raise
    
    def analyze_financial_data(self, data_context: str, user_query: str) -> str:
        """Analyze financial data with Claude's reasoning capabilities"""
        try:
            system_prompt = """You are Claude, an advanced AI financial analyst specializing in QuickBooks Online data analysis. 
            
            Your expertise includes:
            - Financial statement analysis and insights
            - Revenue forecasting and trend analysis  
            - Cash flow optimization recommendations
            - Business performance metrics interpretation
            - Actionable financial advice for small-mid businesses
            
            Guidelines for responses:
            - Be concise yet comprehensive in your analysis
            - Focus on actionable insights and recommendations
            - Use clear, business-friendly language
            - Highlight key trends, patterns, and anomalies
            - Provide specific next steps when possible
            - Be honest about limitations of the data
            
            When analyzing QuickBooks data:
            - Account types: Asset, Liability, Equity, Income, Expense
            - Key metrics: Revenue growth, profit margins, cash flow, expense ratios
            - Important dates and periods for trend analysis
            - Context matters - consider seasonality and business type
            
            Format your response as structured JSON with the following format:
            {
                "analysis": "Your detailed analysis",
                "key_insights": ["insight 1", "insight 2", ...],
                "recommendations": ["recommendation 1", "recommendation 2", ...],
                "metrics": {
                    "metric_name": "value_and_explanation"
                },
                "next_steps": ["action 1", "action 2", ...]
            }
            """
            
            messages = [
                {"role": "user", "content": f"""
                Financial Data Context:
                {data_context}
                
                User Question: {user_query}
                
                Please provide a thorough analysis addressing the user's question with specific insights, trends, and actionable recommendations based on the QuickBooks data provided.
                """}
            ]
            
            response = self.chat_completion(messages, system_prompt, temperature=0.3)
            
            # Try to parse as JSON, fallback to text response
            try:
                parsed_response = json.loads(response)
                return parsed_response
            except json.JSONDecodeError:
                return {
                    "analysis": response,
                    "key_insights": [],
                    "recommendations": [],
                    "metrics": {},
                    "next_steps": []
                }
            
        except Exception as e:
            logger.error(f"Financial analysis failed: {e}")
            raise
    
    def generate_forecast(self, historical_data: List[Dict], 
                         forecast_type: str = "revenue", 
                         periods: int = 12) -> Dict[str, Any]:
        """Generate financial forecasts using Claude's reasoning"""
        try:
            data_summary = self._summarize_historical_data(historical_data, forecast_type)
            
            system_prompt = """You are Claude, an expert financial forecasting AI. Provide data-driven forecasts with clear reasoning and actionable insights.
            
            Respond with structured JSON in this format:
            {
                "forecast_values": [{"period": "2024-01", "value": 1000, "confidence": 0.8}, ...],
                "reasoning": "Detailed explanation of the forecast methodology",
                "assumptions": ["assumption 1", "assumption 2", ...],
                "confidence_level": 0.85,
                "risk_factors": ["risk 1", "risk 2", ...],
                "recommendations": ["recommendation 1", "recommendation 2", ...]
            }
            """
            
            forecast_prompt = f"""
            Based on the following historical {forecast_type} data from QuickBooks Online, 
            generate a {periods}-period forecast with reasoning:
            
            Historical Data Summary:
            {data_summary}
            
            Please provide:
            1. Forecast values for the next {periods} periods
            2. Confidence level and reasoning
            3. Key assumptions made
            4. Risk factors to consider
            5. Recommendations for improving forecast accuracy
            
            Format the forecast as structured JSON for business decision-making.
            """
            
            messages = [
                {"role": "user", "content": forecast_prompt}
            ]
            
            response = self.chat_completion(messages, system_prompt, temperature=0.2)
            
            # Try to parse as JSON
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {
                    "forecast_values": [],
                    "reasoning": response,
                    "assumptions": [],
                    "confidence_level": 0.5,
                    "risk_factors": [],
                    "recommendations": []
                }
            
        except Exception as e:
            logger.error(f"Forecast generation failed: {e}")
            raise
    
    def _summarize_historical_data(self, data: List[Dict], data_type: str) -> str:
        """Summarize historical data for analysis"""
        if not data:
            return f"No historical {data_type} data available"
        
        try:
            summary_lines = [f"Historical {data_type.title()} Data ({len(data)} records):"]
            
            # Add data summary based on type
            if data_type == "revenue":
                for item in data[-12:]:  # Last 12 periods
                    period = item.get('period', 'Unknown')
                    amount = item.get('amount', 0)
                    summary_lines.append(f"- {period}: ${amount:,.2f}")
            
            elif data_type == "accounts":
                account_summary = {}
                for account in data:
                    account_type = account.get('AccountType', 'Unknown')
                    balance = float(account.get('CurrentBalance', 0))
                    if account_type not in account_summary:
                        account_summary[account_type] = []
                    account_summary[account_type].append(balance)
                
                for acc_type, balances in account_summary.items():
                    total = sum(balances)
                    count = len(balances)
                    summary_lines.append(f"- {acc_type}: {count} accounts, Total: ${total:,.2f}")
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            logger.warning(f"Data summarization failed: {e}")
            return f"Historical {data_type} data available ({len(data)} records)"
    
    def explain_financial_concept(self, concept: str, context: str = "") -> str:
        """Explain financial concepts in simple terms"""
        try:
            system_prompt = """You are Claude, an expert financial educator. Explain complex financial concepts in simple, actionable terms for small business owners.
            
            Provide responses in this JSON format:
            {
                "definition": "Simple, clear definition",
                "importance": "Why this matters for business",
                "how_to_improve": "Actionable steps to optimize",
                "common_mistakes": ["mistake 1", "mistake 2", ...],
                "example": "Practical example relevant to small business"
            }
            """
            
            messages = [
                {"role": "user", "content": f"""
                Please explain the financial concept: "{concept}"
                
                {f"Business context: {context}" if context else ""}
                
                Provide:
                1. Simple definition
                2. Why it matters for business
                3. How to improve/optimize it
                4. Common mistakes to avoid
                5. Practical example
                
                Keep it practical and actionable for small business owners.
                """}
            ]
            
            response = self.chat_completion(messages, system_prompt)
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {
                    "definition": response,
                    "importance": "",
                    "how_to_improve": "",
                    "common_mistakes": [],
                    "example": ""
                }
            
        except Exception as e:
            logger.error(f"Concept explanation failed: {e}")
            raise
    
    def create_agent_response(self, agent_type: str, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create responses for different types of agents"""
        try:
            if agent_type == "finance":
                return self._finance_agent_response(query, context)
            elif agent_type == "sales":
                return self._sales_agent_response(query, context)
            elif agent_type == "operations":
                return self._operations_agent_response(query, context)
            elif agent_type == "custom":
                return self._custom_agent_response(query, context)
            else:
                return self._general_agent_response(query, context)
                
        except Exception as e:
            logger.error(f"Agent response creation failed for {agent_type}: {e}")
            raise
    
    def _finance_agent_response(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Finance-specific agent response"""
        system_prompt = """You are Claude, a specialized Finance AI Agent for ERPInsight.ai. You focus on:
        - Cash flow analysis and forecasting
        - Profitability analysis
        - Budget variance explanations
        - Financial KPI interpretation
        - Risk assessment and mitigation
        
        Always provide actionable financial insights with specific numbers when available."""
        
        return self._process_agent_query(system_prompt, query, context)
    
    def _sales_agent_response(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Sales-specific agent response"""
        system_prompt = """You are Claude, a specialized Sales AI Agent for ERPInsight.ai. You focus on:
        - Revenue analysis and trends
        - Customer segmentation insights
        - Sales performance metrics
        - Customer churn analysis
        - Revenue optimization strategies
        
        Always provide data-driven sales insights with growth recommendations."""
        
        return self._process_agent_query(system_prompt, query, context)
    
    def _operations_agent_response(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Operations-specific agent response"""
        system_prompt = """You are Claude, a specialized Operations AI Agent for ERPInsight.ai. You focus on:
        - Inventory optimization
        - Expense analysis and control
        - Process efficiency improvements
        - Vendor and supplier analysis
        - Operational KPI monitoring
        
        Always provide operational insights that improve efficiency and reduce costs."""
        
        return self._process_agent_query(system_prompt, query, context)
    
    def _custom_agent_response(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Custom agent response based on user-defined prompts"""
        custom_prompt = context.get('agent_prompt', 'You are a helpful business analyst.')
        return self._process_agent_query(custom_prompt, query, context)
    
    def _general_agent_response(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """General business agent response"""
        system_prompt = """You are Claude, a general business AI agent for ERPInsight.ai. Provide comprehensive business analysis and insights based on QuickBooks data."""
        
        return self._process_agent_query(system_prompt, query, context)
    
    def _process_agent_query(self, system_prompt: str, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process query with specific agent prompt"""
        financial_data = context.get('financial_data', '')
        
        messages = [
            {"role": "user", "content": f"""
            Query: {query}
            
            Available Data:
            {financial_data}
            
            Company: {context.get('company_name', 'Unknown')}
            Date: {context.get('timestamp', datetime.now().isoformat())}
            
            Please provide detailed analysis with actionable insights.
            """}
        ]
        
        response = self.chat_completion(messages, system_prompt, temperature=0.4)
        
        # Try to structure the response
        try:
            parsed_response = json.loads(response)
            return parsed_response
        except json.JSONDecodeError:
            return {
                "response": response,
                "insights": {},
                "recommendations": [],
                "charts": [],
                "next_steps": []
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Check if Claude API is accessible"""
        try:
            # Simple test request
            messages = [{"role": "user", "content": "Hello, please confirm you're working correctly."}]
            response = self.chat_completion(messages, max_tokens=50)
            
            return {
                "status": "healthy",
                "model": self.model,
                "response_length": len(response),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }