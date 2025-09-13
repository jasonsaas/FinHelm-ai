import { query } from './_generated/server'
import { v } from 'convex/values'

export const finHelmTest = query({
  args: {},
  handler: async (ctx) => {
    // Return comprehensive financial analysis mock data
    return {
      summary: {
        currentCash: 450000,
        monthlyBurnRate: 85000,
        runwayMonths: 5.3,
        revenue: {
          current: 125000,
          lastMonth: 110000,
          growth: 13.6
        },
        expenses: {
          current: 85000,
          lastMonth: 82000,
          growth: 3.7
        }
      },
      cashFlow: {
        forecast: Array.from({ length: 13 }, (_, i) => ({
          weekNumber: i + 1,
          weekStart: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
          expectedReceivables: 30000 + Math.random() * 15000,
          expectedPayables: 20000 + Math.random() * 10000,
          projectedBalance: 450000 + (i * 10000) - Math.random() * 5000,
        }))
      },
      accountHierarchy: [
        {
          id: '1',
          name: 'Assets',
          type: 'ASSET',
          balance: 750000,
          children: [
            { id: '11', name: 'Current Assets', type: 'ASSET', balance: 600000 },
            { id: '12', name: 'Fixed Assets', type: 'ASSET', balance: 150000 }
          ]
        },
        {
          id: '2',
          name: 'Liabilities',
          type: 'LIABILITY',
          balance: 200000,
          children: [
            { id: '21', name: 'Current Liabilities', type: 'LIABILITY', balance: 150000 },
            { id: '22', name: 'Long-term Debt', type: 'LIABILITY', balance: 50000 }
          ]
        },
        {
          id: '3',
          name: 'Equity',
          type: 'EQUITY',
          balance: 550000,
          children: [
            { id: '31', name: 'Common Stock', type: 'EQUITY', balance: 400000 },
            { id: '32', name: 'Retained Earnings', type: 'EQUITY', balance: 150000 }
          ]
        }
      ],
      recentTransactions: Array.from({ length: 10 }, (_, i) => ({
        id: `txn-${i + 1}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        description: [
          'Payment from Customer ABC',
          'AWS Infrastructure',
          'Payroll Processing',
          'Office Rent',
          'Software Licenses',
          'Marketing Campaign',
          'Consultant Payment',
          'Equipment Purchase',
          'Insurance Premium',
          'Utility Bill'
        ][i],
        amount: [25000, -3500, -45000, -12000, -2500, -8000, -5000, -15000, -4000, -800][i],
        category: [
          'Revenue',
          'Technology',
          'Payroll',
          'Rent',
          'Software',
          'Marketing',
          'Professional Services',
          'Equipment',
          'Insurance',
          'Utilities'
        ][i],
        account: [
          'Accounts Receivable',
          'Operating Expenses',
          'Payroll Expenses',
          'Rent Expense',
          'Software Expenses',
          'Marketing Expenses',
          'Professional Fees',
          'Equipment',
          'Insurance Expense',
          'Utilities Expense'
        ][i]
      })),
      kpis: {
        dso: 42,
        dpo: 35,
        workingCapital: 450000,
        currentRatio: 4.0,
        quickRatio: 3.8,
        grossMargin: 68,
        operatingMargin: 15,
        netMargin: 12
      },
      aiInsights: [
        {
          type: 'warning',
          title: 'Cash Flow Alert',
          message: 'Based on current burn rate, you have 5.3 months of runway. Consider accelerating receivables collection.',
          priority: 'high'
        },
        {
          type: 'opportunity',
          title: 'Cost Optimization',
          message: 'AWS costs increased 25% last month. Review infrastructure usage for optimization opportunities.',
          priority: 'medium'
        },
        {
          type: 'success',
          title: 'Revenue Growth',
          message: 'Revenue grew 13.6% MoM, exceeding target by 3.6%. Customer acquisition strategy is working well.',
          priority: 'low'
        }
      ]
    }
  }
})

export const getAccountHierarchy = query({
  args: {},
  handler: async (ctx) => {
    // Return account hierarchy
    const accounts = await ctx.db.query('accounts').collect()
    
    // Build hierarchy
    const hierarchy = accounts
      .filter(acc => !acc.parentAccountId)
      .map(parent => ({
        ...parent,
        children: accounts.filter(child => child.parentAccountId === parent._id)
      }))
    
    return hierarchy
  }
})

export const getRecentTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    // Return recent transactions
    const transactions = await ctx.db
      .query('transactions')
      .order('desc')
      .take(limit)
    
    return transactions
  }
})