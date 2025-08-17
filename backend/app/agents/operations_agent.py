from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime, timedelta
from ..services.quickbooks_service import QuickBooksService
from ..services.claude_service import ClaudeService
from ..services.rag_service import RAGService

logger = logging.getLogger(__name__)

class OperationsAgent:
    """Specialized agent for operations analysis using QuickBooks data and Claude LLM"""
    
    def __init__(self, agent_config: Optional[Dict] = None):
        self.config = agent_config or {}
        self.qb_service = QuickBooksService()
        self.claude_service = ClaudeService()
        self.rag_service = RAGService()
        self.conversation_history: List[Dict] = []
    
    def process_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process operations query with QuickBooks data and Claude analysis"""
        try:
            # Get QuickBooks credentials from context
            access_token = context.get('access_token')
            realm_id = context.get('realm_id')
            
            if not access_token or not realm_id:
                return {
                    "response": "I need an active QuickBooks connection to analyze your operations data. Please connect to QuickBooks first.",
                    "charts": [],
                    "operations_data": {},
                    "insights": {},
                    "error": "No QuickBooks access"
                }
            
            # Analyze query to determine data requirements
            data_requirements = self._analyze_query_requirements(query)
            
            # Fetch required operations data from QuickBooks
            operations_data = self._fetch_operations_data(
                access_token, realm_id, data_requirements
            )
            
            # Add operations data to RAG system for context
            user_id = context.get('user_id')
            if user_id:
                for data_type, data in operations_data.items():
                    self.rag_service.add_financial_data(user_id, data, f"ops_{data_type}")
            
            # Search for relevant context using RAG
            relevant_context = self.rag_service.search_relevant_context(query, user_id) if user_id else []
            
            # Generate charts for visualization
            charts = self._generate_operations_charts(operations_data, data_requirements)
            
            # Format data context for Claude analysis
            data_context = self._format_operations_context(operations_data, relevant_context)
            
            # Get AI analysis from Claude using operations agent
            claude_response = self.claude_service.create_agent_response("operations", query, {
                "financial_data": data_context,
                "company_name": context.get('company_name', 'Unknown'),
                "timestamp": context.get('timestamp', datetime.now().isoformat())
            })
            
            # Calculate key operations metrics
            metrics = self._calculate_operations_metrics(operations_data)
            
            # Add to conversation history
            self.conversation_history.append({
                "query": query,
                "response": claude_response,
                "timestamp": datetime.now().isoformat(),
                "data_sources": list(operations_data.keys())
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
                "operations_data": operations_data,
                "insights": {
                    "metrics": metrics,
                    "key_insights": insights,
                    "data_sources": list(operations_data.keys()),
                    "analysis_type": "claude_operations_analysis",
                    "rag_context_used": len(relevant_context) > 0
                },
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error processing operations query: {e}")
            return {
                "response": "I encountered an error while analyzing your operations data. Please try rephrasing your question or check your QuickBooks connection.",
                "charts": [],
                "operations_data": {},
                "insights": {},
                "error": str(e)
            }
    
    def _analyze_query_requirements(self, query: str) -> List[str]:
        """Analyze query to determine what QuickBooks operations data is needed"""
        query_lower = query.lower()
        requirements = []
        
        # Map query keywords to data requirements
        keyword_mapping = {
            'expense': ['expenses', 'accounts'],
            'cost': ['expenses', 'items'],
            'inventory': ['items'],
            'stock': ['items'],
            'vendor': ['vendors', 'bills'],
            'supplier': ['vendors', 'bills'],
            'bill': ['bills', 'vendors'],
            'purchase': ['bills', 'items'],
            'payable': ['bills', 'accounts'],
            'cash': ['accounts'],
            'efficiency': ['expenses', 'items'],
            'optimization': ['expenses', 'items', 'vendors'],
            'process': ['expenses', 'bills'],
            'workflow': ['expenses', 'bills'],
            'budget': ['accounts', 'expenses'],
            'spending': ['expenses', 'bills'],
            'procurement': ['vendors', 'items', 'bills']
        }
        
        for keyword, data_types in keyword_mapping.items():
            if keyword in query_lower:
                requirements.extend(data_types)
        
        # Remove duplicates and default to expenses if nothing specific
        requirements = list(set(requirements))
        if not requirements:
            requirements = ['expenses', 'vendors']
        
        logger.info(f"Operations query requirements determined: {requirements}")
        return requirements
    
    def _fetch_operations_data(self, access_token: str, realm_id: str, 
                              requirements: List[str]) -> Dict[str, List[Dict]]:
        """Fetch required operations data from QuickBooks"""
        operations_data = {}
        
        try:
            if 'expenses' in requirements:
                # Get expenses from last 12 months
                date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
                expenses = self.qb_service.query_expenses(access_token, realm_id, date_from)
                operations_data['expenses'] = expenses
                logger.info(f"Fetched {len(expenses)} expenses")
            
            if 'accounts' in requirements:
                accounts = self.qb_service.query_accounts(access_token, realm_id)
                # Filter to expense and asset accounts for operations
                operations_accounts = [acc for acc in accounts if acc.get('AccountType') in ['Expense', 'Other Current Asset', 'Fixed Asset']]
                operations_data['accounts'] = operations_accounts
                logger.info(f"Fetched {len(operations_accounts)} operations-related accounts")
            
            if 'vendors' in requirements:
                vendors = self.qb_service.query_vendors(access_token, realm_id)
                operations_data['vendors'] = vendors
                logger.info(f"Fetched {len(vendors)} vendors")
            
            if 'items' in requirements:
                items = self.qb_service.query_items(access_token, realm_id)
                operations_data['items'] = items
                logger.info(f"Fetched {len(items)} items")
            
            if 'bills' in requirements:
                # Get bills from last 12 months
                date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
                bills = self.qb_service.query_bills(access_token, realm_id, date_from)
                operations_data['bills'] = bills
                logger.info(f"Fetched {len(bills)} bills")
                
        except Exception as e:
            logger.error(f"Error fetching operations data: {e}")
            
        return operations_data
    
    def _format_operations_context(self, operations_data: Dict[str, Any], relevant_context: List[Dict] = None) -> str:
        """Format operations data for Claude analysis"""
        context_parts = []
        
        # Add RAG context if available
        if relevant_context:
            context_parts.append("=== RELEVANT HISTORICAL OPERATIONS CONTEXT ===")
            for ctx in relevant_context[:3]:  # Top 3 most relevant
                context_parts.append(f"Context Score: {ctx['score']:.2f}")
                context_parts.append(f"Data Type: {ctx['data_type']}")
                context_parts.append(f"Content: {ctx['content'][:300]}...")
                context_parts.append("---")
        
        if 'expenses' in operations_data:
            expenses = operations_data['expenses']
            context_parts.append(f"\n=== BUSINESS EXPENSES ({len(expenses)} expenses) ===")
            
            total_amount = sum(float(exp.get('TotalAmt', 0)) for exp in expenses)
            context_parts.append(f"Total Expenses: ${total_amount:,.2f}")
            
            # Expense categories
            expense_categories = {}
            for exp in expenses:
                category = exp.get('AccountRef', {}).get('name', 'Uncategorized')
                amount = float(exp.get('TotalAmt', 0))
                expense_categories[category] = expense_categories.get(category, 0) + amount
            
            context_parts.append("\nTop Expense Categories:")
            for category, amount in sorted(expense_categories.items(), key=lambda x: x[1], reverse=True)[:5]:
                context_parts.append(f"  - {category}: ${amount:,.2f}")
        
        if 'accounts' in operations_data:
            accounts = operations_data['accounts']
            context_parts.append(f"\n=== OPERATIONS ACCOUNTS ({len(accounts)} accounts) ===")
            
            # Group by account type
            account_groups = {}
            for account in accounts:
                acc_type = account.get('AccountType', 'Unknown')
                balance = float(account.get('CurrentBalance', 0))
                if acc_type not in account_groups:
                    account_groups[acc_type] = {'count': 0, 'total': 0}
                account_groups[acc_type]['count'] += 1
                account_groups[acc_type]['total'] += balance
            
            for acc_type, data in account_groups.items():
                context_parts.append(f"{acc_type}: {data['count']} accounts, Total: ${data['total']:,.2f}")
        
        if 'vendors' in operations_data:
            vendors = operations_data['vendors']
            context_parts.append(f"\n=== VENDOR RELATIONSHIPS ({len(vendors)} vendors) ===")
            
            active_vendors = [v for v in vendors if v.get('Active', True)]
            total_balance = sum(float(v.get('Balance', 0)) for v in vendors)
            
            context_parts.append(f"Active Vendors: {len(active_vendors)}")
            context_parts.append(f"Total Vendor Balance: ${total_balance:,.2f}")
            
            # Top vendors by balance
            if vendors:
                top_vendors = sorted(vendors, key=lambda x: abs(float(x.get('Balance', 0))), reverse=True)[:5]
                context_parts.append("\nTop Vendors by Balance:")
                for vendor in top_vendors:
                    name = vendor.get('Name', 'Unknown')
                    balance = float(vendor.get('Balance', 0))
                    if balance != 0:
                        context_parts.append(f"  - {name}: ${balance:,.2f}")
        
        if 'items' in operations_data:
            items = operations_data['items']
            context_parts.append(f"\n=== INVENTORY & ITEMS ({len(items)} items) ===")
            
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
            
            # Inventory items with low stock alerts
            low_stock_items = []
            for item in active_items:
                if item.get('Type') == 'Inventory' and item.get('QtyOnHand') is not None:
                    qty = float(item.get('QtyOnHand', 0))
                    if qty < 10:  # Threshold for low stock
                        low_stock_items.append(item)
            
            if low_stock_items:
                context_parts.append(f"\nLow Stock Alert ({len(low_stock_items)} items):")
                for item in low_stock_items[:5]:
                    name = item.get('Name', 'Unknown')
                    qty = float(item.get('QtyOnHand', 0))
                    context_parts.append(f"  - {name}: {qty} units remaining")
        
        if 'bills' in operations_data:
            bills = operations_data['bills']
            context_parts.append(f"\n=== VENDOR BILLS ({len(bills)} bills) ===")
            
            total_amount = sum(float(bill.get('TotalAmt', 0)) for bill in bills)
            total_balance = sum(float(bill.get('Balance', 0)) for bill in bills)
            
            context_parts.append(f"Total Bills Amount: ${total_amount:,.2f}")
            context_parts.append(f"Outstanding Balance: ${total_balance:,.2f}")
            context_parts.append(f"Payment Rate: {((total_amount - total_balance) / total_amount * 100) if total_amount > 0 else 0:.1f}%")
        
        return "\n".join(context_parts) if context_parts else "No operations data available for analysis."
    
    def _generate_operations_charts(self, operations_data: Dict[str, Any], requirements: List[str]) -> List[Dict[str, Any]]:
        """Generate chart configurations for operations visualization"""
        charts = []
        
        try:
            if 'expenses' in operations_data:
                expenses = operations_data['expenses']
                
                # Monthly Expense Trend Chart
                monthly_expenses = {}
                for expense in expenses:
                    date = expense.get('TxnDate', '')
                    if date:
                        month = date[:7]  # YYYY-MM
                        amount = float(expense.get('TotalAmt', 0))
                        monthly_expenses[month] = monthly_expenses.get(month, 0) + amount
                
                if monthly_expenses and len(monthly_expenses) > 1:
                    sorted_months = sorted(monthly_expenses.keys())
                    charts.append({
                        "title": "Monthly Expense Trend",
                        "type": "line",
                        "data": {
                            "labels": sorted_months,
                            "datasets": [{
                                "label": "Expenses ($)",
                                "data": [monthly_expenses[month] for month in sorted_months],
                                "borderColor": 'rgba(239, 68, 68, 1)',
                                "backgroundColor": 'rgba(239, 68, 68, 0.2)',
                                "tension": 0.4
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Monthly Expense Trend"
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
                
                # Expense Categories Chart
                expense_categories = {}
                for expense in expenses:
                    category = expense.get('AccountRef', {}).get('name', 'Uncategorized')
                    amount = float(expense.get('TotalAmt', 0))
                    expense_categories[category] = expense_categories.get(category, 0) + amount
                
                if expense_categories:
                    # Get top 10 categories
                    top_categories = sorted(expense_categories.items(), key=lambda x: x[1], reverse=True)[:10]
                    
                    charts.append({
                        "title": "Top Expense Categories",
                        "type": "doughnut",
                        "data": {
                            "labels": [cat[0] for cat in top_categories],
                            "datasets": [{
                                "data": [cat[1] for cat in top_categories],
                                "backgroundColor": [
                                    'rgba(239, 68, 68, 0.8)',
                                    'rgba(245, 101, 101, 0.8)',
                                    'rgba(248, 113, 113, 0.8)',
                                    'rgba(252, 165, 165, 0.8)',
                                    'rgba(254, 202, 202, 0.8)',
                                    'rgba(255, 205, 86, 0.8)',
                                    'rgba(75, 192, 192, 0.8)',
                                    'rgba(153, 102, 255, 0.8)',
                                    'rgba(255, 159, 64, 0.8)',
                                    'rgba(199, 199, 199, 0.8)'
                                ]
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Expense Distribution by Category"
                                },
                                "legend": {
                                    "position": "right"
                                }
                            }
                        }
                    })
            
            if 'vendors' in operations_data and 'bills' in operations_data:
                # Top Vendors by Amount Chart
                vendor_spending = {}
                for bill in operations_data['bills']:
                    vendor_ref = bill.get('VendorRef', {})
                    vendor_name = vendor_ref.get('name', 'Unknown')
                    amount = float(bill.get('TotalAmt', 0))
                    vendor_spending[vendor_name] = vendor_spending.get(vendor_name, 0) + amount
                
                if vendor_spending:
                    # Get top 10 vendors
                    top_vendors = sorted(vendor_spending.items(), key=lambda x: x[1], reverse=True)[:10]
                    
                    charts.append({
                        "title": "Top Vendors by Spending",
                        "type": "bar",
                        "data": {
                            "labels": [vendor[0] for vendor in top_vendors],
                            "datasets": [{
                                "label": "Amount Spent ($)",
                                "data": [vendor[1] for vendor in top_vendors],
                                "backgroundColor": 'rgba(168, 85, 247, 0.6)',
                                "borderColor": 'rgba(168, 85, 247, 1)',
                                "borderWidth": 1
                            }]
                        },
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "title": {
                                    "display": True,
                                    "text": "Top Vendors by Spending"
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
            logger.error(f"Error generating operations charts: {e}")
        
        return charts
    
    def _calculate_operations_metrics(self, operations_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key operations metrics from QuickBooks data"""
        metrics = {}
        
        try:
            if 'expenses' in operations_data:
                expenses = operations_data['expenses']
                
                total_expenses = sum(float(exp.get('TotalAmt', 0)) for exp in expenses)
                
                # Calculate monthly expense growth
                monthly_expenses = {}
                for exp in expenses:
                    date = exp.get('TxnDate', '')
                    if date:
                        month = date[:7]
                        amount = float(exp.get('TotalAmt', 0))
                        monthly_expenses[month] = monthly_expenses.get(month, 0) + amount
                
                expense_growth_rate = 0
                if len(monthly_expenses) >= 2:
                    sorted_months = sorted(monthly_expenses.keys())
                    if len(sorted_months) >= 2:
                        current_month = monthly_expenses[sorted_months[-1]]
                        previous_month = monthly_expenses[sorted_months[-2]]
                        if previous_month > 0:
                            expense_growth_rate = ((current_month - previous_month) / previous_month) * 100
                
                metrics.update({
                    'total_expenses': total_expenses,
                    'average_expense': total_expenses / len(expenses) if expenses else 0,
                    'monthly_expense_growth': expense_growth_rate,
                    'expense_count': len(expenses)
                })
            
            if 'vendors' in operations_data:
                vendors = operations_data['vendors']
                
                active_vendors = len([v for v in vendors if v.get('Active', True)])
                total_vendor_balance = sum(float(v.get('Balance', 0)) for v in vendors)
                
                metrics.update({
                    'total_vendors': len(vendors),
                    'active_vendors': active_vendors,
                    'total_vendor_balance': total_vendor_balance,
                    'average_vendor_balance': total_vendor_balance / len(vendors) if vendors else 0
                })
            
            if 'bills' in operations_data:
                bills = operations_data['bills']
                
                total_bills = sum(float(bill.get('TotalAmt', 0)) for bill in bills)
                total_outstanding = sum(float(bill.get('Balance', 0)) for bill in bills)
                
                metrics.update({
                    'total_bills': total_bills,
                    'total_outstanding_bills': total_outstanding,
                    'bill_payment_rate': ((total_bills - total_outstanding) / total_bills * 100) if total_bills > 0 else 0,
                    'bill_count': len(bills)
                })
            
            if 'items' in operations_data:
                items = operations_data['items']
                
                active_items = len([item for item in items if item.get('Active', True)])
                inventory_items = len([item for item in items if item.get('Type') == 'Inventory'])
                
                # Calculate total inventory value
                inventory_value = 0
                low_stock_count = 0
                for item in items:
                    if item.get('Type') == 'Inventory':
                        qty = float(item.get('QtyOnHand', 0))
                        unit_price = float(item.get('UnitPrice', 0))
                        inventory_value += qty * unit_price
                        
                        if qty < 10:  # Low stock threshold
                            low_stock_count += 1
                
                metrics.update({
                    'total_items': len(items),
                    'active_items': active_items,
                    'inventory_items': inventory_items,
                    'inventory_value': inventory_value,
                    'low_stock_items': low_stock_count
                })
        
        except Exception as e:
            logger.error(f"Error calculating operations metrics: {e}")
        
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
                    'optimize', 'reduce', 'streamline', 'automate', 'consolidate'
                ]):
                    if len(line) > 20:  # Skip very short lines
                        recommendations.append(line)
            
            # Limit to top 5 recommendations
            return recommendations[:5]
        
        except Exception as e:
            logger.error(f"Error extracting recommendations: {e}")
            return []