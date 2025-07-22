import requests
import json
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
from ..core.config import settings

logger = logging.getLogger(__name__)

class GrokService:
    """Service for interacting with xAI Grok API"""
    
    def __init__(self):
        self.api_key = settings.grok_api_key
        self.api_base = settings.grok_api_base
        self.model = settings.grok_model
        self.max_tokens = settings.grok_max_tokens
        self.temperature = settings.grok_temperature
    
    def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make authenticated request to Grok API"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            url = f"{self.api_base}/{endpoint}"
            response = requests.post(url, headers=headers, json=data, timeout=60)
            
            if response.status_code != 200:
                raise Exception(f"Grok API error: {response.status_code} - {response.text}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise Exception("Grok API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Grok API request failed: {e}")
        except Exception as e:
            logger.error(f"Grok API error: {e}")
            raise
    
    def chat_completion(self, messages: List[Dict[str, str]], 
                       temperature: Optional[float] = None,
                       max_tokens: Optional[int] = None) -> str:
        """Generate chat completion using Grok"""
        try:
            data = {
                'model': self.model,
                'messages': messages,
                'temperature': temperature or self.temperature,
                'max_tokens': max_tokens or self.max_tokens,
                'stream': False
            }
            
            response = self._make_request('chat/completions', data)
            
            # Extract the response content
            if 'choices' in response and len(response['choices']) > 0:
                content = response['choices'][0].get('message', {}).get('content', '')
                
                # Log token usage if available
                if 'usage' in response:
                    usage = response['usage']
                    logger.info(f"Grok API usage - prompt: {usage.get('prompt_tokens', 0)}, "
                              f"completion: {usage.get('completion_tokens', 0)}, "
                              f"total: {usage.get('total_tokens', 0)}")
                
                return content.strip()
            else:
                raise Exception("No response content from Grok API")
                
        except Exception as e:
            logger.error(f"Grok chat completion failed: {e}")
            raise
    
    def analyze_financial_data(self, data_context: str, user_query: str) -> str:
        """Analyze financial data with Grok's reasoning capabilities"""
        try:
            system_prompt = """You are Grok, an advanced AI financial analyst specializing in QuickBooks Online data analysis. 
            
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
            """
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""
                Financial Data Context:
                {data_context}
                
                User Question: {user_query}
                
                Please provide a thorough analysis addressing the user's question with specific insights, trends, and actionable recommendations based on the QuickBooks data provided.
                """}
            ]
            
            return self.chat_completion(messages, temperature=0.3)  # Lower temperature for financial analysis
            
        except Exception as e:
            logger.error(f"Financial analysis failed: {e}")
            raise
    
    def generate_forecast(self, historical_data: List[Dict], 
                         forecast_type: str = "revenue", 
                         periods: int = 12) -> str:
        """Generate financial forecasts using Grok's reasoning"""
        try:
            data_summary = self._summarize_historical_data(historical_data, forecast_type)
            
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
            
            Format the forecast in a clear, actionable way for business decision-making.
            """
            
            messages = [
                {"role": "system", "content": "You are Grok, an expert financial forecasting AI. Provide data-driven forecasts with clear reasoning and actionable insights."},
                {"role": "user", "content": forecast_prompt}
            ]
            
            return self.chat_completion(messages, temperature=0.2)  # Very low temperature for forecasting
            
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
            messages = [
                {"role": "system", "content": "You are Grok, an expert financial educator. Explain complex financial concepts in simple, actionable terms for small business owners."},
                {"role": "user", "content": f"""
                Please explain the financial concept: "{concept}"
                
                {f"Business context: {context}" if context else ""}
                
                Provide:
                1. Simple definition
                2. Why it matters for business
                3. How to improve/optimize it
                4. Common mistakes to avoid
                
                Keep it practical and actionable.
                """}
            ]
            
            return self.chat_completion(messages)
            
        except Exception as e:
            logger.error(f"Concept explanation failed: {e}")
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """Check if Grok API is accessible"""
        try:
            # Simple test request
            messages = [{"role": "user", "content": "Hello, are you working?"}]
            response = self.chat_completion(messages, max_tokens=50)
            
            return {
                "status": "healthy",
                "model": self.model,
                "api_base": self.api_base,
                "response_length": len(response),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }