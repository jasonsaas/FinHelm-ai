"""
Agent configurations for ERPInsight.ai multi-agent system
"""

from typing import Dict, List, Any
from datetime import datetime

AGENT_CONFIGURATIONS = {
    "finance": {
        "id": "finance",
        "name": "Finance Agent",
        "description": "AI specialist for financial analysis, cash flow management, and forecasting",
        "version": "2.0.0",
        "capabilities": [
            "Cash flow analysis and forecasting",
            "Profit & loss statement interpretation", 
            "Budget variance explanations",
            "Financial KPI calculation and tracking",
            "Risk assessment and mitigation strategies",
            "Working capital optimization",
            "Tax planning insights",
            "Financial trend analysis"
        ],
        "tools": [
            "quickbooks_data_fetcher",
            "financial_ratio_calculator", 
            "trend_analyzer",
            "forecast_generator",
            "variance_analyzer"
        ],
        "system_prompt": """You are the Finance Agent for ERPInsight.ai, specializing in comprehensive financial analysis using QuickBooks Online data.

        Your core competencies:
        - Advanced financial ratio analysis and interpretation
        - Multi-period cash flow forecasting with confidence intervals
        - Budget vs actual variance analysis with root cause identification
        - Risk assessment using financial indicators
        - Working capital optimization strategies
        - Predictive analytics for financial planning
        
        ANALYSIS FRAMEWORK:
        1. DATA VALIDATION: Verify data completeness and accuracy
        2. RATIO ANALYSIS: Calculate and interpret key financial ratios
        3. TREND IDENTIFICATION: Identify patterns in historical data
        4. FORECASTING: Project future performance with uncertainty bands
        5. RISK ASSESSMENT: Identify financial risks and mitigation strategies
        6. RECOMMENDATIONS: Provide specific, actionable financial advice
        
        Always provide quantified insights with specific dollar amounts, percentages, and confidence levels.""",
        "default_tools": ["financial_calculator", "trend_analyzer"],
        "response_format": "structured_json",
        "confidence_threshold": 0.75,
        "icon": "💰",
        "color": "#2E7D32"
    },
    
    "sales": {
        "id": "sales", 
        "name": "Sales Agent",
        "description": "AI specialist for sales performance analysis and revenue optimization",
        "version": "2.0.0",
        "capabilities": [
            "Customer lifetime value analysis",
            "Sales trend and seasonality analysis",
            "Revenue forecasting and pipeline management", 
            "Customer segmentation and profiling",
            "Churn prediction and retention strategies",
            "Product/service performance analysis",
            "Sales efficiency optimization",
            "Market opportunity identification"
        ],
        "tools": [
            "customer_analyzer",
            "revenue_forecaster",
            "churn_predictor", 
            "segmentation_engine",
            "pipeline_analyzer"
        ],
        "system_prompt": """You are the Sales Agent for ERPInsight.ai, focused on driving revenue growth through data-driven sales insights.

        Your expertise areas:
        - Customer lifetime value calculation and optimization
        - Revenue trend analysis with seasonality adjustments
        - Churn prediction using behavioral indicators
        - Customer segmentation for targeted strategies
        - Sales funnel optimization and conversion analysis
        - Product performance and cross-selling opportunities
        
        SALES ANALYSIS APPROACH:
        1. CUSTOMER INSIGHTS: Analyze customer behavior and value
        2. REVENUE PATTERNS: Identify trends and growth opportunities
        3. PERFORMANCE METRICS: Calculate key sales KPIs
        4. PREDICTIVE MODELING: Forecast revenue and identify at-risk customers
        5. OPTIMIZATION: Recommend strategies to improve sales performance
        6. ACTION PLANNING: Provide specific steps to implement improvements
        
        Focus on actionable insights that directly impact revenue growth and customer retention.""",
        "default_tools": ["customer_analyzer", "revenue_forecaster"],
        "response_format": "structured_json",
        "confidence_threshold": 0.70,
        "icon": "📈", 
        "color": "#1976D2"
    },
    
    "operations": {
        "id": "operations",
        "name": "Operations Agent", 
        "description": "AI specialist for business operations optimization and cost management",
        "version": "2.0.0",
        "capabilities": [
            "Expense analysis and cost optimization",
            "Inventory management and optimization",
            "Vendor performance analysis",
            "Process efficiency improvements",
            "Resource allocation optimization", 
            "Supply chain risk assessment",
            "Operational KPI monitoring",
            "Automation opportunity identification"
        ],
        "tools": [
            "expense_analyzer",
            "inventory_optimizer",
            "vendor_evaluator",
            "efficiency_analyzer",
            "cost_optimizer"
        ],
        "system_prompt": """You are the Operations Agent for ERPInsight.ai, dedicated to optimizing business operations and reducing costs.

        Your specialization includes:
        - Comprehensive expense analysis and cost reduction strategies
        - Inventory optimization to balance carrying costs and stockouts
        - Vendor performance evaluation and relationship optimization
        - Process efficiency improvements and automation opportunities
        - Resource allocation optimization across departments
        - Supply chain risk identification and mitigation
        
        OPERATIONAL ANALYSIS FRAMEWORK:
        1. COST ANALYSIS: Identify expense patterns and optimization opportunities
        2. EFFICIENCY METRICS: Measure operational performance indicators
        3. PROCESS OPTIMIZATION: Identify bottlenecks and improvement areas
        4. RESOURCE PLANNING: Optimize allocation of resources and assets
        5. RISK MANAGEMENT: Assess operational risks and mitigation strategies
        6. IMPLEMENTATION: Provide specific operational improvement recommendations
        
        Always quantify potential savings and efficiency gains with realistic timelines.""",
        "default_tools": ["expense_analyzer", "efficiency_analyzer"],
        "response_format": "structured_json", 
        "confidence_threshold": 0.70,
        "icon": "⚙️",
        "color": "#F57C00"
    },
    
    "executive": {
        "id": "executive",
        "name": "Executive Agent",
        "description": "AI specialist for high-level business insights and strategic planning",
        "version": "2.0.0", 
        "capabilities": [
            "Executive dashboard insights",
            "Strategic business analysis",
            "Company-wide KPI monitoring",
            "Competitive analysis support", 
            "Investment decision support",
            "Growth opportunity identification",
            "Risk management overview",
            "Performance benchmarking"
        ],
        "tools": [
            "executive_dashboard",
            "strategic_analyzer",
            "kpi_monitor",
            "benchmark_analyzer",
            "growth_identifier"
        ],
        "system_prompt": """You are the Executive Agent for ERPInsight.ai, providing strategic business insights for leadership decision-making.

        Your strategic focus:
        - High-level business performance analysis
        - Strategic opportunity identification and evaluation
        - Company-wide KPI synthesis and interpretation
        - Risk assessment from a strategic perspective
        - Investment and growth opportunity analysis
        - Competitive positioning insights
        
        EXECUTIVE ANALYSIS APPROACH:
        1. STRATEGIC OVERVIEW: Synthesize company-wide performance
        2. OPPORTUNITY ANALYSIS: Identify growth and improvement opportunities
        3. RISK ASSESSMENT: Evaluate strategic risks and mitigation options
        4. PERFORMANCE BENCHMARKING: Compare against industry standards
        5. RESOURCE ALLOCATION: Recommend optimal resource deployment
        6. STRATEGIC RECOMMENDATIONS: Provide actionable strategic guidance
        
        Present insights in executive-friendly format with clear implications for business strategy.""",
        "default_tools": ["strategic_analyzer", "kpi_monitor"],
        "response_format": "executive_summary",
        "confidence_threshold": 0.80,
        "icon": "🎯",
        "color": "#7B1FA2"
    }
}

AGENT_TOOLS = {
    "financial_calculator": {
        "name": "Financial Ratio Calculator",
        "description": "Calculates key financial ratios and metrics",
        "parameters": ["financial_data"],
        "returns": "financial_ratios"
    },
    "trend_analyzer": {
        "name": "Trend Analysis Tool", 
        "description": "Identifies trends and patterns in time series data",
        "parameters": ["time_series_data", "analysis_period"],
        "returns": "trend_analysis"
    },
    "forecast_generator": {
        "name": "Financial Forecast Generator",
        "description": "Generates financial forecasts with confidence intervals", 
        "parameters": ["historical_data", "forecast_periods", "method"],
        "returns": "forecast_data"
    },
    "customer_analyzer": {
        "name": "Customer Analysis Tool",
        "description": "Analyzes customer behavior and value metrics",
        "parameters": ["customer_data", "transaction_data"],
        "returns": "customer_insights"
    },
    "expense_analyzer": {
        "name": "Expense Analysis Tool",
        "description": "Analyzes expense patterns and optimization opportunities",
        "parameters": ["expense_data", "budget_data"], 
        "returns": "expense_insights"
    }
}

def get_agent_config(agent_id: str) -> Dict[str, Any]:
    """Get configuration for specific agent"""
    return AGENT_CONFIGURATIONS.get(agent_id, {})

def get_all_agents() -> Dict[str, Dict[str, Any]]:
    """Get all agent configurations"""
    return AGENT_CONFIGURATIONS

def get_agent_capabilities(agent_id: str) -> List[str]:
    """Get capabilities for specific agent"""
    config = get_agent_config(agent_id)
    return config.get("capabilities", [])

def get_agent_tools(agent_id: str) -> List[str]:
    """Get tools available for specific agent"""
    config = get_agent_config(agent_id)
    return config.get("tools", [])

def validate_agent_request(agent_id: str, query: str) -> Dict[str, Any]:
    """Validate if agent can handle the request"""
    config = get_agent_config(agent_id)
    if not config:
        return {"valid": False, "reason": "Unknown agent"}
    
    # Simple keyword-based validation
    query_lower = query.lower()
    capabilities = [cap.lower() for cap in config.get("capabilities", [])]
    
    # Check if query relates to agent capabilities
    relevance_score = 0
    for capability in capabilities:
        for word in capability.split():
            if word in query_lower:
                relevance_score += 1
    
    confidence = min(relevance_score / len(capabilities), 1.0)
    
    return {
        "valid": True,
        "confidence": confidence,
        "recommended": confidence > 0.3,
        "agent_name": config.get("name", "Unknown")
    }

# Agent routing logic
def route_query_to_agent(query: str) -> str:
    """Route query to most appropriate agent"""
    query_lower = query.lower()
    
    # Finance keywords
    finance_keywords = ["cash", "profit", "revenue", "expense", "budget", "forecast", "financial", "ratio", "balance"]
    
    # Sales keywords  
    sales_keywords = ["customer", "sales", "revenue", "growth", "churn", "retention", "pipeline", "conversion"]
    
    # Operations keywords
    operations_keywords = ["inventory", "vendor", "supplier", "cost", "efficiency", "process", "operations"]
    
    # Executive keywords
    executive_keywords = ["strategy", "kpi", "performance", "overview", "dashboard", "executive", "strategic"]
    
    # Count keyword matches
    scores = {
        "finance": sum(1 for keyword in finance_keywords if keyword in query_lower),
        "sales": sum(1 for keyword in sales_keywords if keyword in query_lower), 
        "operations": sum(1 for keyword in operations_keywords if keyword in query_lower),
        "executive": sum(1 for keyword in executive_keywords if keyword in query_lower)
    }
    
    # Return agent with highest score, default to finance
    best_agent = max(scores, key=scores.get)
    return best_agent if scores[best_agent] > 0 else "finance"