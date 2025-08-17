import anthropic
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from ..core.config import settings

logger = logging.getLogger(__name__)

class ClaudeService:
    """Enhanced service for interacting with Anthropic's Claude API with agentic capabilities"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.claude_max_tokens
        self.temperature = settings.claude_temperature
        
        # Initialize agentic tools
        self.analysis_tools = self._create_analysis_tools()
        self.forecasting_tools = self._create_forecasting_tools()
    
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
    
    def _create_analysis_tools(self) -> List:
        """Create tools for financial analysis"""
        
        @tool
        def calculate_financial_ratios(financial_data: Dict[str, Any]) -> Dict[str, float]:
            """Calculate key financial ratios from provided data"""
            try:
                # Extract key figures
                total_assets = financial_data.get('total_assets', 0)
                total_liabilities = financial_data.get('total_liabilities', 0)
                total_revenue = financial_data.get('total_revenue', 0)
                net_income = financial_data.get('net_income', 0)
                total_expenses = financial_data.get('total_expenses', 0)
                
                ratios = {}
                
                # Debt-to-Asset Ratio
                if total_assets > 0:
                    ratios['debt_to_assets'] = total_liabilities / total_assets
                
                # Net Profit Margin
                if total_revenue > 0:
                    ratios['net_profit_margin'] = net_income / total_revenue
                
                # Expense Ratio
                if total_revenue > 0:
                    ratios['expense_ratio'] = total_expenses / total_revenue
                
                # Asset Turnover (simplified)
                if total_assets > 0:
                    ratios['asset_efficiency'] = total_revenue / total_assets
                
                return ratios
                
            except Exception as e:
                logger.error(f"Error calculating ratios: {e}")
                return {}
        
        @tool
        def identify_trends(time_series_data: List[Dict[str, Any]]) -> Dict[str, Any]:
            """Identify trends in time series financial data"""
            try:
                if len(time_series_data) < 2:
                    return {"trend": "insufficient_data"}
                
                # Simple trend analysis
                values = [item.get('value', 0) for item in time_series_data]
                periods = len(values)
                
                # Calculate growth rate
                if periods >= 2 and values[0] != 0:
                    growth_rate = ((values[-1] - values[0]) / values[0]) * 100
                else:
                    growth_rate = 0
                
                # Determine trend direction
                if growth_rate > 10:
                    trend = "strong_growth"
                elif growth_rate > 0:
                    trend = "growth"
                elif growth_rate > -10:
                    trend = "decline"
                else:
                    trend = "strong_decline"
                
                # Calculate volatility (standard deviation)
                if periods > 1:
                    mean_val = sum(values) / periods
                    variance = sum((x - mean_val) ** 2 for x in values) / periods
                    volatility = variance ** 0.5
                else:
                    volatility = 0
                
                return {
                    "trend": trend,
                    "growth_rate": round(growth_rate, 2),
                    "volatility": round(volatility, 2),
                    "periods_analyzed": periods,
                    "recent_value": values[-1] if values else 0
                }
                
            except Exception as e:
                logger.error(f"Error identifying trends: {e}")
                return {"trend": "analysis_error"}
        
        return [calculate_financial_ratios, identify_trends]
    
    def _create_forecasting_tools(self) -> List:
        """Create tools for financial forecasting"""
        
        @tool
        def simple_linear_forecast(historical_values: List[float], periods: int = 12) -> List[Dict[str, Any]]:
            """Generate simple linear forecast based on historical values"""
            try:
                if len(historical_values) < 2:
                    return []
                
                # Calculate linear trend
                n = len(historical_values)
                x_vals = list(range(n))
                y_vals = historical_values
                
                # Simple linear regression
                x_mean = sum(x_vals) / n
                y_mean = sum(y_vals) / n
                
                numerator = sum((x_vals[i] - x_mean) * (y_vals[i] - y_mean) for i in range(n))
                denominator = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
                
                if denominator != 0:
                    slope = numerator / denominator
                    intercept = y_mean - slope * x_mean
                else:
                    slope = 0
                    intercept = y_mean
                
                # Generate forecasts
                forecasts = []
                for i in range(periods):
                    future_x = n + i
                    forecast_value = slope * future_x + intercept
                    
                    # Add some uncertainty bounds (simplified)
                    uncertainty = abs(forecast_value) * 0.1  # 10% uncertainty
                    
                    forecasts.append({
                        "period": i + 1,
                        "forecast_value": max(0, forecast_value),  # No negative values
                        "lower_bound": max(0, forecast_value - uncertainty),
                        "upper_bound": forecast_value + uncertainty,
                        "confidence": max(0.3, 1.0 - (i * 0.05))  # Decreasing confidence
                    })
                
                return forecasts
                
            except Exception as e:
                logger.error(f"Error generating forecast: {e}")
                return []
        
        @tool
        def analyze_forecast_accuracy(actual_values: List[float], forecasted_values: List[float]) -> Dict[str, Any]:
            """Analyze the accuracy of previous forecasts"""
            try:
                if len(actual_values) != len(forecasted_values) or len(actual_values) == 0:
                    return {"accuracy": "insufficient_data"}
                
                # Calculate MAPE (Mean Absolute Percentage Error)
                mape_sum = 0
                valid_points = 0
                
                for i in range(len(actual_values)):
                    actual = actual_values[i]
                    forecast = forecasted_values[i]
                    
                    if actual != 0:
                        mape_sum += abs((actual - forecast) / actual)
                        valid_points += 1
                
                if valid_points > 0:
                    mape = (mape_sum / valid_points) * 100
                    accuracy = max(0, 100 - mape)
                else:
                    accuracy = 0
                
                # Calculate MSE (Mean Squared Error)
                mse = sum((actual_values[i] - forecasted_values[i]) ** 2 for i in range(len(actual_values))) / len(actual_values)
                
                return {
                    "accuracy_percentage": round(accuracy, 2),
                    "mape": round(mape, 2) if valid_points > 0 else 0,
                    "mse": round(mse, 2),
                    "data_points": len(actual_values),
                    "forecast_quality": "high" if accuracy > 80 else "medium" if accuracy > 60 else "low"
                }
                
            except Exception as e:
                logger.error(f"Error analyzing forecast accuracy: {e}")
                return {"accuracy": "analysis_error"}
        
        return [simple_linear_forecast, analyze_forecast_accuracy]
    
    def enhanced_financial_analysis(self, data_context: str, user_query: str, 
                                   rag_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Enhanced financial analysis using agentic tools and RAG context"""
        try:
            # Prepare enhanced system prompt with RAG context
            rag_info = ""
            if rag_context and rag_context.get("enhanced"):
                context_data = rag_context.get("context", {})
                rag_info = f"""
                
                ENHANCED RAG CONTEXT:
                - Context Quality: {context_data.get('context_quality', 'unknown')}
                - Data Types Available: {', '.join(context_data.get('data_types', []))}
                - Synthesized Context: {context_data.get('synthesized_context', '')}
                - Confidence Level: {rag_context.get('confidence', 0.0):.2f}
                """
            
            system_prompt = f"""You are Claude, an advanced AI financial analyst with agentic capabilities specializing in QuickBooks Online data analysis.
            
            Your expertise includes:
            - Multi-step reasoning for complex financial analysis
            - Advanced financial ratio calculations and interpretation
            - Trend analysis and pattern recognition
            - Forecasting with uncertainty quantification
            - Risk assessment and mitigation strategies
            - Actionable recommendations with prioritization
            
            AGENTIC WORKFLOW APPROACH:
            1. ANALYZE: Break down the query into components
            2. CALCULATE: Use available financial data to compute key metrics
            3. CONTEXTUALIZE: Consider historical patterns and industry benchmarks  
            4. FORECAST: Project future trends when relevant
            5. RECOMMEND: Provide specific, actionable next steps
            
            {rag_info}
            
            Guidelines for responses:
            - Use multi-step reasoning to build comprehensive analysis
            - Quantify insights with specific numbers and percentages
            - Identify both opportunities and risks
            - Prioritize recommendations by impact and feasibility
            - Explain your reasoning process transparently
            - Acknowledge data limitations and uncertainty
            
            Format your response as structured JSON:
            {{
                "analysis": "Your detailed multi-step analysis",
                "key_insights": ["quantified insight 1", "insight 2", ...],
                "financial_metrics": {{
                    "metric_name": {{"value": 123.45, "interpretation": "explanation"}}
                }},
                "recommendations": [
                    {{"action": "specific action", "priority": "high/medium/low", "impact": "description"}}
                ],
                "risk_factors": ["risk 1", "risk 2", ...],
                "confidence_level": 0.85,
                "next_steps": ["immediate action 1", "action 2", ...],
                "reasoning_process": ["step 1", "step 2", "step 3", ...]
            }}
            """
            
            messages = [
                {"role": "user", "content": f"""
                Financial Data Context:
                {data_context}
                
                User Question: {user_query}
                
                Please provide a comprehensive agentic analysis that demonstrates multi-step reasoning, quantified insights, and actionable recommendations. Show your reasoning process clearly.
                """}
            ]
            
            response = self.chat_completion(messages, system_prompt, temperature=0.2)
            
            # Try to parse as JSON with enhanced error handling
            try:
                parsed_response = json.loads(response)
                
                # Validate required fields
                required_fields = ['analysis', 'key_insights', 'recommendations']
                for field in required_fields:
                    if field not in parsed_response:
                        parsed_response[field] = []
                
                # Add metadata
                parsed_response['enhanced'] = True
                parsed_response['rag_enhanced'] = rag_context is not None
                
                return parsed_response
                
            except json.JSONDecodeError:
                return {
                    "analysis": response,
                    "key_insights": [],
                    "recommendations": [],
                    "financial_metrics": {},
                    "risk_factors": [],
                    "confidence_level": 0.7,
                    "next_steps": [],
                    "reasoning_process": ["Fallback response - JSON parsing failed"],
                    "enhanced": False
                }
                
        except Exception as e:
            logger.error(f"Enhanced financial analysis failed: {e}")
            raise