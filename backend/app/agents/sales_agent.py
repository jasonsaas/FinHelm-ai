from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime, timedelta
from ..services.quickbooks_service import QuickBooksService
from ..services.claude_service import ClaudeService
from ..services.rag_service import RAGService

logger = logging.getLogger(__name__)

class SalesAgent:
    """Specialized agent for sales analysis using QuickBooks data and Claude LLM"""
    
    def __init__(self, agent_config: Optional[Dict] = None):
        self.config = agent_config or {}
        self.qb_service = QuickBooksService()
        self.claude_service = ClaudeService()
        self.rag_service = RAGService()
        self.conversation_history: List[Dict] = []
    
    def process_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process sales query with QuickBooks data and Claude analysis"""
        try:
            # Get QuickBooks credentials from context
            access_token = context.get('access_token')
            realm_id = context.get('realm_id')
            
            if not access_token or not realm_id:
                return {
                    "response": "I need an active QuickBooks connection to analyze your sales data. Please connect to QuickBooks first.",
                    "charts": [],
                    "sales_data": {},
                    "insights": {},
                    "error": "No QuickBooks access"
                }
            
            # Analyze query to determine data requirements
            data_requirements = self._analyze_query_requirements(query)
            
            # Fetch required sales data from QuickBooks
            sales_data = self._fetch_sales_data(
                access_token, realm_id, data_requirements
            )
            
            # Add sales data to RAG system for context
            user_id = context.get('user_id')
            if user_id:
                for data_type, data in sales_data.items():
                    self.rag_service.add_financial_data(user_id, data, f"sales_{data_type}")
            
            # Search for relevant context using RAG
            relevant_context = self.rag_service.search_relevant_context(query, user_id) if user_id else []
            
            # Generate charts for visualization
            charts = self._generate_sales_charts(sales_data, data_requirements)
            
            # Format data context for Claude analysis
            data_context = self._format_sales_context(sales_data, relevant_context)
            
            # Get AI analysis from Claude using sales agent
            claude_response = self.claude_service.create_agent_response("sales", query, {
                "financial_data": data_context,
                "company_name": context.get('company_name', 'Unknown'),
                "timestamp": context.get('timestamp', datetime.now().isoformat())
            })
            
            # Calculate key sales metrics
            metrics = self._calculate_sales_metrics(sales_data)
            
            # Add to conversation history
            self.conversation_history.append({
                "query": query,
                "response": claude_response,
                "timestamp": datetime.now().isoformat(),
                "data_sources": list(sales_data.keys())
            })
            
            # Extract structured response if available
            if isinstance(claude_response, dict):
                response_text = claude_response.get("response", "")
                recommendations = claude_response.get("recommendations", [])
                insights = claude_response.get("insights", [])
            else:
                response_text = claude_response
                recommendations = self._extract_recommendations(claude_response)
                insights = []
            
            return {
                "response": response_text,
                "charts": charts,
                "sales_data": sales_data,
                "insights": {
                    "metrics": metrics,
                    "key_insights": insights,
                    "data_sources": list(sales_data.keys()),
                    "analysis_type": "claude_sales_analysis",
                    "rag_context_used": len(relevant_context) > 0
                },
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error processing sales query: {e}")
            return {
                "response": "I encountered an error while analyzing your sales data. Please try rephrasing your question or check your QuickBooks connection.",
                "charts": [],
                "sales_data": {},
                "insights": {},
                "error": str(e)
            }
    
    def _analyze_query_requirements(self, query: str) -> List[str]:
        """Analyze query to determine what QuickBooks sales data is needed"""
        query_lower = query.lower()
        requirements = []
        
        # Map query keywords to data requirements
        keyword_mapping = {
            'revenue': ['invoices', 'items'],
            'sales': ['invoices', 'customers'],
            'customer': ['customers', 'invoices'],
            'client': ['customers', 'invoices'],
            'invoice': ['invoices'],
            'payment': ['payments', 'invoices'],
            'item': ['items', 'invoices'],
            'product': ['items', 'invoices'],
            'service': ['items', 'invoices'],
            'growth': ['invoices', 'customers'],
            'trend': ['invoices', 'items'],
            'forecast': ['invoices', 'customers', 'items'],
            'performance': ['invoices', 'items', 'customers'],
            'analysis': ['invoices', 'customers', 'items'],
            'churn': ['customers', 'invoices'],
            'retention': ['customers', 'invoices']
        }
        
        for keyword, data_types in keyword_mapping.items():
            if keyword in query_lower:
                requirements.extend(data_types)
        
        # Remove duplicates and default to invoices if nothing specific
        requirements = list(set(requirements))
        if not requirements:
            requirements = ['invoices', 'customers']
        
        logger.info(f"Sales query requirements determined: {requirements}")
        return requirements
    
    def _fetch_sales_data(self, access_token: str, realm_id: str, 
                         requirements: List[str]) -> Dict[str, List[Dict]]:
        """Fetch required sales data from QuickBooks"""
        sales_data = {}
        
        try:
            if 'invoices' in requirements:
                # Get invoices from last 12 months
                date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
                invoices = self.qb_service.query_invoices(access_token, realm_id, date_from)
                sales_data['invoices'] = invoices
                logger.info(f"Fetched {len(invoices)} invoices")
            
            if 'customers' in requirements:
                customers = self.qb_service.query_customers(access_token, realm_id)
                sales_data['customers'] = customers
                logger.info(f"Fetched {len(customers)} customers")
            
            if 'items' in requirements:
                items = self.qb_service.query_items(access_token, realm_id)
                sales_data['items'] = items
                logger.info(f"Fetched {len(items)} items")
            
            if 'payments' in requirements:
                # Get payments from last 12 months
                date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
                payments = self.qb_service.query_payments(access_token, realm_id, date_from)
                sales_data['payments'] = payments
                logger.info(f"Fetched {len(payments)} payments")
                
        except Exception as e:
            logger.error(f"Error fetching sales data: {e}")
            
        return sales_data
    
    def _format_sales_context(self, sales_data: Dict[str, Any], relevant_context: List[Dict] = None) -> str:
        """Format sales data for Claude analysis"""
        context_parts = []
        
        # Add RAG context if available
        if relevant_context:
            context_parts.append("=== RELEVANT HISTORICAL SALES CONTEXT ===")
            for ctx in relevant_context[:3]:  # Top 3 most relevant
                context_parts.append(f"Context Score: {ctx['score']:.2f}")
                context_parts.append(f"Data Type: {ctx['data_type']}")
                context_parts.append(f"Content: {ctx['content'][:300]}...")
                context_parts.append("---")
        
        if 'invoices' in sales_data:
            invoices = sales_data['invoices']
            context_parts.append(f"\n=== SALES INVOICES ({len(invoices)} invoices) ===")
            
            total_amount = sum(float(inv.get('TotalAmt', 0)) for inv in invoices)
            total_balance = sum(float(inv.get('Balance', 0)) for inv in invoices)
            
            context_parts.append(f"Total Sales Amount: ${total_amount:,.2f}")
            context_parts.append(f"Outstanding Balance: ${total_balance:,.2f}")
            context_parts.append(f"Collection Rate: {((total_amount - total_balance) / total_amount * 100) if total_amount > 0 else 0:.1f}%")
            
            # Monthly sales trend
            monthly_sales = {}
            for inv in invoices:
                date = inv.get('TxnDate', '')
                if date:
                    month = date[:7]  # YYYY-MM
                    amount = float(inv.get('TotalAmt', 0))
                    monthly_sales[month] = monthly_sales.get(month, 0) + amount
            
            if monthly_sales:
                context_parts.append("\nMonthly Sales Trend:")
                for month in sorted(monthly_sales.keys())[-6:]:  # Last 6 months
                    context_parts.append(f"  - {month}: ${monthly_sales[month]:,.2f}")
        
        if 'customers' in sales_data:
            customers = sales_data['customers']
            context_parts.append(f"\n=== CUSTOMER BASE ({len(customers)} customers) ===")
            
            active_customers = [c for c in customers if c.get('Active', True)]
            total_balance = sum(float(c.get('Balance', 0)) for c in customers)
            
            context_parts.append(f"Active Customers: {len(active_customers)}")
            context_parts.append(f"Total Customer Balance: ${total_balance:,.2f}")
            
            # Top customers by balance
            top_customers = sorted(customers, key=lambda x: abs(float(x.get('Balance', 0))), reverse=True)[:5]
            context_parts.append("\nTop Customers by Balance:")
            for customer in top_customers:
                name = customer.get('Name', 'Unknown')
                balance = float(customer.get('Balance', 0))
                context_parts.append(f"  - {name}: ${balance:,.2f}")
        
        if 'items' in sales_data:
            items = sales_data['items']
            context_parts.append(f"\n=== PRODUCTS/SERVICES ({len(items)} items) ===")
            
            active_items = [item for item in items if item.get('Active', True)]
            context_parts.append(f"Active Items: {len(active_items)}")
            
            # Items by type
            item_types = {}
            for item in active_items:
                item_type = item.get('Type', 'Unknown')
                item_types[item_type] = item_types.get(item_type, 0) + 1
            
            context_parts.append("Items by Type:")
            for item_type, count in item_types.items():
                context_parts.append(f"  - {item_type}: {count} items")
        
        if 'payments' in sales_data:
            payments = sales_data['payments']
            context_parts.append(f"\n=== PAYMENTS RECEIVED ({len(payments)} payments) ===")
            
            total_payments = sum(float(p.get('TotalAmt', 0)) for p in payments)
            context_parts.append(f"Total Payments Received: ${total_payments:,.2f}")
        
        return "\n".join(context_parts) if context_parts else "No sales data available for analysis."
    
    def _generate_sales_charts(self, sales_data: Dict[str, Any], requirements: List[str]) -> List[Dict[str, Any]]:
        """Generate chart configurations for sales visualization"""
        charts = []
        
        try:
            if 'invoices' in sales_data:
                invoices = sales_data['invoices']
                
                # Monthly Sales Trend Chart
                monthly_sales = {}
                for invoice in invoices:
                    date = invoice.get('TxnDate', '')
                    if date:
                        month = date[:7]  # YYYY-MM
                        amount = float(invoice.get('TotalAmt', 0))
                        monthly_sales[month] = monthly_sales.get(month, 0) + amount
                
                if monthly_sales and len(monthly_sales) > 1:
                    sorted_months = sorted(monthly_sales.keys())
                    charts.append({
                        "title": "Monthly Sales Trend",
                        "type": "line",
                        "data": {
                            "labels": sorted_months,
                            "datasets": [{
                                "label": "Sales ($)",
                                "data": [monthly_sales[month] for month in sorted_months],
                                "borderColor": 'rgba(34, 197, 94, 1)',
                                "backgroundColor": 'rgba(34, 197, 94, 0.2)',
                                "tension": 0.4
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Monthly Sales Trend"
                                }
                            },
                            "scales": {
                                "y": {
                                    "beginAtZero": True,
                                    "ticks": {
                                        "callback": "function(value) { return '$' + value.toLocaleString(); }"
                                    }
                                }
                            }
                        }
                    })
            
            if 'customers' in sales_data and 'invoices' in sales_data:
                # Top Customers by Revenue Chart
                customer_revenue = {}
                for invoice in sales_data['invoices']:
                    customer_ref = invoice.get('CustomerRef', {})
                    customer_name = customer_ref.get('name', 'Unknown')
                    amount = float(invoice.get('TotalAmt', 0))
                    customer_revenue[customer_name] = customer_revenue.get(customer_name, 0) + amount
                
                if customer_revenue:
                    # Get top 10 customers
                    top_customers = sorted(customer_revenue.items(), key=lambda x: x[1], reverse=True)[:10]
                    
                    charts.append({
                        "title": "Top Customers by Revenue",
                        "type": "bar",
                        "data": {
                            "labels": [customer[0] for customer in top_customers],
                            "datasets": [{
                                "label": "Revenue ($)",
                                "data": [customer[1] for customer in top_customers],
                                "backgroundColor": 'rgba(59, 130, 246, 0.6)',
                                "borderColor": 'rgba(59, 130, 246, 1)',
                                "borderWidth": 1
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Top Customers by Revenue"
                                }
                            },
                            "scales": {
                                "y": {
                                    "beginAtZero": True,
                                    "ticks": {
                                        "callback": "function(value) { return '$' + value.toLocaleString(); }"
                                    }
                                }
                            }
                        }
                    })
        
        except Exception as e:
            logger.error(f"Error generating sales charts: {e}")
        
        return charts
    
    def _calculate_sales_metrics(self, sales_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key sales metrics from QuickBooks data"""
        metrics = {}
        
        try:
            if 'invoices' in sales_data:
                invoices = sales_data['invoices']
                
                total_sales = sum(float(inv.get('TotalAmt', 0)) for inv in invoices)
                total_outstanding = sum(float(inv.get('Balance', 0)) for inv in invoices)
                
                # Calculate monthly growth
                monthly_sales = {}
                for inv in invoices:
                    date = inv.get('TxnDate', '')
                    if date:
                        month = date[:7]
                        amount = float(inv.get('TotalAmt', 0))
                        monthly_sales[month] = monthly_sales.get(month, 0) + amount
                
                growth_rate = 0
                if len(monthly_sales) >= 2:
                    sorted_months = sorted(monthly_sales.keys())
                    if len(sorted_months) >= 2:
                        current_month = monthly_sales[sorted_months[-1]]
                        previous_month = monthly_sales[sorted_months[-2]]
                        if previous_month > 0:
                            growth_rate = ((current_month - previous_month) / previous_month) * 100
                
                metrics.update({
                    'total_sales': total_sales,
                    'total_outstanding': total_outstanding,
                    'collection_rate': ((total_sales - total_outstanding) / total_sales * 100) if total_sales > 0 else 0,
                    'average_invoice_value': total_sales / len(invoices) if invoices else 0,
                    'monthly_growth_rate': growth_rate,
                    'invoice_count': len(invoices)
                })
            
            if 'customers' in sales_data:
                customers = sales_data['customers']
                
                active_customers = len([c for c in customers if c.get('Active', True)])
                total_customer_balance = sum(float(c.get('Balance', 0)) for c in customers)
                
                metrics.update({
                    'total_customers': len(customers),
                    'active_customers': active_customers,
                    'total_customer_balance': total_customer_balance,
                    'average_customer_balance': total_customer_balance / len(customers) if customers else 0
                })
            
            if 'items' in sales_data:
                items = sales_data['items']
                
                active_items = len([item for item in items if item.get('Active', True)])
                
                metrics.update({
                    'total_items': len(items),
                    'active_items': active_items
                })
        
        except Exception as e:
            logger.error(f"Error calculating sales metrics: {e}")
        
        return metrics
    
    def _extract_recommendations(self, claude_response: str) -> List[str]:
        """Extract actionable recommendations from Claude response"""
        recommendations = []
        
        try:
            lines = claude_response.split('\n')
            
            for line in lines:
                line = line.strip()
                # Look for recommendation indicators
                if any(indicator in line.lower() for indicator in [
                    'recommend', 'suggest', 'should', 'consider', 'improve',
                    'optimize', 'focus on', 'increase', 'boost', 'grow'
                ]):
                    if len(line) > 20:  # Skip very short lines
                        recommendations.append(line)
            
            # Limit to top 5 recommendations
            return recommendations[:5]
        
        except Exception as e:
            logger.error(f"Error extracting recommendations: {e}")
            return []