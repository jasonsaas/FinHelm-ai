from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime, timedelta
from ..services.quickbooks_service import QuickBooksService
from ..services.grok_service import GrokService

logger = logging.getLogger(__name__)

class FinanceAgent:
    """Specialized agent for financial analysis using QuickBooks data and Grok LLM"""
    
    def __init__(self, agent_config: Optional[Dict] = None):
        self.config = agent_config or {}
        self.qb_service = QuickBooksService()
        self.grok_service = GrokService()
        self.conversation_history: List[Dict] = []
    
    def process_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process financial query with QuickBooks data and Grok analysis"""
        try:
            # Get QuickBooks credentials from context
            access_token = context.get('access_token')
            realm_id = context.get('realm_id')
            
            if not access_token or not realm_id:
                return {
                    "response": "I need an active QuickBooks connection to analyze your financial data. Please connect to QuickBooks first.",
                    "charts": [],
                    "financial_data": {},
                    "insights": {},
                    "error": "No QuickBooks access"
                }
            
            # Analyze query to determine data requirements
            data_requirements = self._analyze_query_requirements(query)
            
            # Fetch required financial data from QuickBooks
            financial_data = self._fetch_financial_data(
                access_token, realm_id, data_requirements
            )
            
            # Generate charts for visualization
            charts = self._generate_charts(financial_data, data_requirements)
            
            # Format data context for Grok analysis
            data_context = self._format_financial_context(financial_data)
            
            # Get AI analysis from Grok
            grok_response = self.grok_service.analyze_financial_data(data_context, query)
            
            # Calculate key financial metrics
            metrics = self._calculate_key_metrics(financial_data)
            
            # Add to conversation history
            self.conversation_history.append({
                "query": query,
                "response": grok_response,
                "timestamp": datetime.now().isoformat(),
                "data_sources": list(financial_data.keys())
            })
            
            return {
                "response": grok_response,
                "charts": charts,
                "financial_data": financial_data,
                "insights": {
                    "metrics": metrics,
                    "data_sources": list(financial_data.keys()),
                    "analysis_type": "grok_financial_analysis"
                },
                "recommendations": self._extract_recommendations(grok_response)
            }
            
        except Exception as e:
            logger.error(f"Error processing finance query: {e}")
            return {
                "response": "I encountered an error while analyzing your financial data. Please try rephrasing your question or check your QuickBooks connection.",
                "charts": [],
                "financial_data": {},
                "insights": {},
                "error": str(e)
            }
    
    def _analyze_query_requirements(self, query: str) -> List[str]:
        """Analyze query to determine what QuickBooks data is needed"""
        query_lower = query.lower()
        requirements = []
        
        # Map query keywords to data requirements
        keyword_mapping = {
            'revenue': ['accounts', 'invoices'],
            'income': ['accounts', 'profit_loss'],
            'expense': ['accounts', 'profit_loss'],
            'profit': ['profit_loss'],
            'loss': ['profit_loss'],
            'account': ['accounts'],
            'balance': ['accounts'],
            'invoice': ['invoices'],
            'customer': ['invoices'],
            'item': ['items'],
            'product': ['items'],
            'forecast': ['accounts', 'invoices', 'profit_loss'],
            'trend': ['accounts', 'invoices'],
            'cash': ['accounts'],
            'asset': ['accounts'],
            'liability': ['accounts'],
            'equity': ['accounts']
        }
        
        for keyword, data_types in keyword_mapping.items():
            if keyword in query_lower:
                requirements.extend(data_types)
        
        # Remove duplicates and default to accounts if nothing specific
        requirements = list(set(requirements))
        if not requirements:
            requirements = ['accounts']
        
        logger.info(f"Query requirements determined: {requirements}")
        return requirements
    
    def _fetch_financial_data(self, access_token: str, realm_id: str, 
                            requirements: List[str]) -> Dict[str, List[Dict]]:
        """Fetch required financial data from QuickBooks"""
        financial_data = {}
        
        try:
            if 'accounts' in requirements:
                accounts = self.qb_service.query_accounts(access_token, realm_id)
                financial_data['accounts'] = accounts
                logger.info(f"Fetched {len(accounts)} accounts")
            
            if 'invoices' in requirements:
                # Get invoices from last 12 months
                date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
                invoices = self.qb_service.query_invoices(access_token, realm_id, date_from)
                financial_data['invoices'] = invoices
                logger.info(f"Fetched {len(invoices)} invoices")
            
            if 'items' in requirements:
                items = self.qb_service.query_items(access_token, realm_id)
                financial_data['items'] = items
                logger.info(f"Fetched {len(items)} items")
            
            if 'profit_loss' in requirements:
                # Get P&L for current year
                start_date = datetime.now().replace(month=1, day=1).strftime('%Y-%m-%d')
                end_date = datetime.now().strftime('%Y-%m-%d')
                profit_loss = self.qb_service.get_profit_loss_report(
                    access_token, realm_id, start_date, end_date
                )
                financial_data['profit_loss'] = profit_loss
                logger.info("Fetched Profit & Loss report")
                
        except Exception as e:
            logger.error(f"Error fetching financial data: {e}")
            
        return financial_data
    
    def _format_financial_context(self, financial_data: Dict[str, Any]) -> str:
        """Format financial data for Grok analysis"""
        context_parts = []
        
        if 'accounts' in financial_data:
            accounts = financial_data['accounts']
            context_parts.append(f"\n=== CHART OF ACCOUNTS ({len(accounts)} accounts) ===")
            
            # Group accounts by type
            account_groups = {}
            for account in accounts:
                acc_type = account.get('AccountType', 'Unknown')
                if acc_type not in account_groups:
                    account_groups[acc_type] = []
                account_groups[acc_type].append(account)
            
            for acc_type, accs in account_groups.items():
                total_balance = sum(float(acc.get('CurrentBalance', 0)) for acc in accs)
                context_parts.append(f"\n{acc_type} ({len(accs)} accounts): ${total_balance:,.2f}")
                
                # Show top 5 accounts by balance in each category
                sorted_accs = sorted(accs, key=lambda x: abs(float(x.get('CurrentBalance', 0))), reverse=True)
                for acc in sorted_accs[:5]:
                    name = acc.get('Name', 'Unknown')
                    balance = float(acc.get('CurrentBalance', 0))
                    context_parts.append(f"  - {name}: ${balance:,.2f}")
        
        if 'invoices' in financial_data:
            invoices = financial_data['invoices']
            context_parts.append(f"\n=== INVOICES ({len(invoices)} invoices) ===")
            
            total_amount = sum(float(inv.get('TotalAmt', 0)) for inv in invoices)
            total_balance = sum(float(inv.get('Balance', 0)) for inv in invoices)
            
            context_parts.append(f"Total Invoice Amount: ${total_amount:,.2f}")
            context_parts.append(f"Outstanding Balance: ${total_balance:,.2f}")
            
            # Recent invoices
            recent_invoices = sorted(invoices, key=lambda x: x.get('TxnDate', ''), reverse=True)[:5]
            context_parts.append("\nRecent Invoices:")
            for inv in recent_invoices:
                doc_num = inv.get('DocNumber', 'N/A')
                date = inv.get('TxnDate', 'N/A')
                amount = float(inv.get('TotalAmt', 0))
                context_parts.append(f"  - #{doc_num} ({date}): ${amount:,.2f}")
        
        if 'profit_loss' in financial_data:
            context_parts.append(f"\n=== PROFIT & LOSS REPORT ===")
            # Add P&L summary (structure varies, so basic handling)
            context_parts.append("Current period Profit & Loss data available for analysis")
        
        if 'items' in financial_data:
            items = financial_data['items']
            context_parts.append(f"\n=== PRODUCTS/SERVICES ({len(items)} items) ===")
            
            # Show active items with prices
            active_items = [item for item in items if item.get('Active', True)]
            context_parts.append(f"Active Items: {len(active_items)}")
        
        return "\n".join(context_parts) if context_parts else "No financial data available for analysis."
    
    def _generate_charts(self, financial_data: Dict[str, Any], requirements: List[str]) -> List[Dict[str, Any]]:
        """Generate chart configurations for frontend visualization"""
        charts = []
        
        try:
            if 'accounts' in financial_data:
                accounts = financial_data['accounts']
                
                # Account Type Distribution Chart
                account_types = {}
                for account in accounts:
                    acc_type = account.get('AccountType', 'Unknown')
                    balance = float(account.get('CurrentBalance', 0))
                    if acc_type not in account_types:
                        account_types[acc_type] = 0
                    account_types[acc_type] += balance
                
                if account_types:
                    charts.append({
                        "title": "Account Balances by Type",
                        "type": "bar",
                        "data": {
                            "labels": list(account_types.keys()),
                            "datasets": [{
                                "label": "Balance ($)",
                                "data": [abs(balance) for balance in account_types.values()],
                                "backgroundColor": [
                                    'rgba(54, 162, 235, 0.6)',
                                    'rgba(255, 99, 132, 0.6)',
                                    'rgba(255, 205, 86, 0.6)',
                                    'rgba(75, 192, 192, 0.6)',
                                    'rgba(153, 102, 255, 0.6)',
                                    'rgba(255, 159, 64, 0.6)'
                                ]
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Account Balances by Type"
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
            
            if 'invoices' in financial_data:
                invoices = financial_data['invoices']
                
                # Monthly Revenue Trend
                monthly_revenue = {}
                for invoice in invoices:
                    date = invoice.get('TxnDate', '')
                    if date:
                        month = date[:7]  # YYYY-MM
                        amount = float(invoice.get('TotalAmt', 0))
                        if month not in monthly_revenue:
                            monthly_revenue[month] = 0
                        monthly_revenue[month] += amount
                
                if monthly_revenue and len(monthly_revenue) > 1:
                    sorted_months = sorted(monthly_revenue.keys())
                    charts.append({
                        "title": "Monthly Revenue Trend",
                        "type": "line",
                        "data": {
                            "labels": sorted_months,
                            "datasets": [{
                                "label": "Revenue ($)",
                                "data": [monthly_revenue[month] for month in sorted_months],
                                "borderColor": 'rgba(75, 192, 192, 1)',
                                "backgroundColor": 'rgba(75, 192, 192, 0.2)',
                                "tension": 0.4
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Monthly Revenue Trend"
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
            logger.error(f"Error generating charts: {e}")
        
        return charts
    
    def _calculate_key_metrics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key financial metrics from QuickBooks data"""
        metrics = {}
        
        try:
            if 'accounts' in financial_data:
                accounts = financial_data['accounts']
                
                account_totals = {
                    'Asset': 0,
                    'Liability': 0,
                    'Equity': 0,
                    'Income': 0,
                    'Expense': 0
                }
                
                for account in accounts:
                    acc_type = account.get('AccountType', '')
                    balance = float(account.get('CurrentBalance', 0))
                    
                    if acc_type in account_totals:
                        account_totals[acc_type] += balance
                
                metrics.update({
                    'total_assets': account_totals['Asset'],
                    'total_liabilities': account_totals['Liability'],
                    'total_equity': account_totals['Equity'],
                    'total_income': account_totals['Income'],
                    'total_expenses': account_totals['Expense'],
                    'net_income': account_totals['Income'] - account_totals['Expense'],
                    'account_count': len(accounts)
                })
            
            if 'invoices' in financial_data:
                invoices = financial_data['invoices']
                
                total_invoiced = sum(float(inv.get('TotalAmt', 0)) for inv in invoices)
                total_outstanding = sum(float(inv.get('Balance', 0)) for inv in invoices)
                
                metrics.update({
                    'total_invoiced': total_invoiced,
                    'total_outstanding': total_outstanding,
                    'collection_rate': ((total_invoiced - total_outstanding) / total_invoiced * 100) if total_invoiced > 0 else 0,
                    'invoice_count': len(invoices)
                })
        
        except Exception as e:
            logger.error(f"Error calculating metrics: {e}")
        
        return metrics
    
    def _extract_recommendations(self, grok_response: str) -> List[str]:
        """Extract actionable recommendations from Grok response"""
        recommendations = []
        
        try:
            # Look for common recommendation patterns in Grok's response
            lines = grok_response.split('\n')
            
            for line in lines:
                line = line.strip()
                # Look for recommendation indicators
                if any(indicator in line.lower() for indicator in [
                    'recommend', 'suggest', 'should', 'consider', 'improve',
                    'optimize', 'focus on', 'action', 'next step'
                ]):
                    if len(line) > 20:  # Skip very short lines
                        recommendations.append(line)
            
            # Limit to top 5 recommendations
            return recommendations[:5]
        
        except Exception as e:
            logger.error(f"Error extracting recommendations: {e}")
            return []
    
    def generate_forecast(self, access_token: str, realm_id: str, 
                         forecast_type: str = "revenue", periods: int = 12) -> Dict[str, Any]:
        """Generate financial forecast using Grok's reasoning"""
        try:
            # Fetch historical data for forecasting
            if forecast_type == "revenue":
                # Get invoice data for revenue forecasting
                date_from = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')  # 2 years
                historical_data = self.qb_service.query_invoices(access_token, realm_id, date_from)
            else:
                # Get account data for other forecasts
                historical_data = self.qb_service.query_accounts(access_token, realm_id)
            
            # Use Grok to generate forecast
            forecast_response = self.grok_service.generate_forecast(
                historical_data, forecast_type, periods
            )
            
            return {
                "forecast_type": forecast_type,
                "periods": periods,
                "analysis": forecast_response,
                "data_points": len(historical_data),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Forecast generation failed: {e}")
            raise