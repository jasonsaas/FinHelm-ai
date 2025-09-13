import React, { useMemo } from 'react';

interface DashboardMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  totalBalanceChange: number;
  monthlyIncomeChange: number;
  monthlyExpensesChange: number;
}

interface Transaction {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: Date;
}

interface CategorySpending {
  category: string;
  amount: number;
}

interface DashboardProps {
  metrics?: DashboardMetrics;
  recentTransactions?: Transaction[];
  categorySpending?: CategorySpending[];
  loading?: boolean;
}

const DashboardOverview = React.memo<{ metrics: DashboardMetrics; loading: boolean }>(({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
        <p className="text-2xl font-bold text-gray-900">${metrics.totalBalance.toLocaleString()}</p>
        <p className={`text-sm ${metrics.totalBalanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {metrics.totalBalanceChange >= 0 ? '+' : ''}{metrics.totalBalanceChange}% from last month
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Income</h3>
        <p className="text-2xl font-bold text-gray-900">${metrics.monthlyIncome.toLocaleString()}</p>
        <p className={`text-sm ${metrics.monthlyIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {metrics.monthlyIncomeChange >= 0 ? '+' : ''}{metrics.monthlyIncomeChange}% from last month
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Expenses</h3>
        <p className="text-2xl font-bold text-gray-900">${metrics.monthlyExpenses.toLocaleString()}</p>
        <p className={`text-sm ${metrics.monthlyExpensesChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          {metrics.monthlyExpensesChange >= 0 ? '+' : ''}{metrics.monthlyExpensesChange}% from last month
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Savings Rate</h3>
        <p className="text-2xl font-bold text-gray-900">{metrics.savingsRate}%</p>
        <p className="text-sm text-blue-600">Target: 30%</p>
      </div>
    </div>
  );
});

const RecentTransactions = React.memo<{ transactions: Transaction[] }>(({ transactions }) => {
  const limitedTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
      <div className="space-y-3">
        {limitedTransactions.map((transaction) => (
          <div key={transaction.id} className="flex justify-between items-center">
            <div>
              <p className="font-medium">{transaction.name}</p>
              <p className="text-sm text-gray-500">{transaction.category}</p>
            </div>
            <span className={`${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const CategorySpending = React.memo<{ categories: CategorySpending[] }>(({ categories }) => {
  const sortedCategories = useMemo(() => 
    categories.sort((a, b) => b.amount - a.amount).slice(0, 8),
    [categories]
  );
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
      <div className="space-y-3">
        {sortedCategories.map((category) => (
          <div key={category.category} className="flex justify-between items-center">
            <span>{category.category}</span>
            <span className="font-medium">${category.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export function DashboardPage({
  metrics = {
    totalBalance: 12456.78,
    monthlyIncome: 5200.00,
    monthlyExpenses: 3847.23,
    savingsRate: 26,
    totalBalanceChange: 2.5,
    monthlyIncomeChange: 5.2,
    monthlyExpensesChange: 8.1
  },
  recentTransactions = [
    { id: '1', name: 'Grocery Store', category: 'Food & Dining', amount: -87.45, date: new Date() },
    { id: '2', name: 'Salary Deposit', category: 'Income', amount: 2600.00, date: new Date() },
    { id: '3', name: 'Electric Bill', category: 'Bills & Utilities', amount: -124.78, date: new Date() }
  ],
  categorySpending = [
    { category: 'Food & Dining', amount: 456.78 },
    { category: 'Transportation', amount: 234.50 },
    { category: 'Bills & Utilities', amount: 189.23 },
    { category: 'Shopping', amount: 167.89 }
  ],
  loading = false
}: DashboardProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your financial health</p>
      </div>

      <DashboardOverview metrics={metrics} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={recentTransactions} />
        <CategorySpending categories={categorySpending} />
      </div>
    </div>
  )
}