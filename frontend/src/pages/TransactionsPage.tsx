import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import LazyWrapper from '../components/LazyWrapper';

// Simple relative time formatter since date-fns is not available
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'Just now';
};

// Lazy load the VirtualizedTable for better performance
const VirtualizedTable = lazy(() => import('../components/VirtualizedTable'));

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  account: string;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
}

interface TransactionsPageProps {
  transactions?: Transaction[];
  loading?: boolean;
}

// Generate mock data for demonstration
const generateMockTransactions = (count: number): Transaction[] => {
  const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Healthcare', 'Entertainment'];
  const accounts = ['Checking Account', 'Savings Account', 'Credit Card'];
  const statuses: Transaction['status'][] = ['completed', 'pending', 'failed'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `txn-${i + 1}`,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    description: `Transaction ${i + 1}`,
    amount: (Math.random() - 0.3) * 1000,
    category: categories[Math.floor(Math.random() * categories.length)],
    account: accounts[Math.floor(Math.random() * accounts.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    reference: Math.random() > 0.7 ? `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined
  }));
};

const TransactionTable = React.memo<{ transactions: Transaction[] }>(({ transactions }) => {
  const columns = useMemo(() => [
    {
      key: 'date' as keyof Transaction,
      header: 'Date',
      width: '140px',
      sortable: true,
      render: (value: Date) => (
        <div>
          <div className="font-medium text-xs">{value.toLocaleDateString()}</div>
          <div className="text-gray-500 text-xs">{formatRelativeTime(value)}</div>
        </div>
      )
    },
    {
      key: 'description' as keyof Transaction,
      header: 'Description',
      sortable: true,
      render: (value: string, item: Transaction) => (
        <div>
          <div className="font-medium text-sm">{value}</div>
          {item.reference && <div className="text-gray-500 text-xs">{item.reference}</div>}
        </div>
      )
    },
    {
      key: 'category' as keyof Transaction,
      header: 'Category',
      width: '120px',
      sortable: true,
      render: (value: string) => (
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {value}
        </span>
      )
    },
    {
      key: 'account' as keyof Transaction,
      header: 'Account',
      width: '140px',
      sortable: true
    },
    {
      key: 'amount' as keyof Transaction,
      header: 'Amount',
      width: '120px',
      sortable: true,
      render: (value: number) => (
        <span className={`font-medium ${value < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {value < 0 ? '-' : '+'}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'status' as keyof Transaction,
      header: 'Status',
      width: '100px',
      sortable: true,
      render: (value: Transaction['status']) => {
        const statusColors = {
          completed: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-red-100 text-red-800'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[value]}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }
    }
  ], []);

  const handleRowClick = useCallback((transaction: Transaction) => {
    console.log('Transaction clicked:', transaction);
  }, []);

  return (
    <LazyWrapper>
      <VirtualizedTable
        data={transactions}
        columns={columns}
        itemHeight={64}
        visibleRows={12}
        onRowClick={handleRowClick}
        searchable={true}
        sortable={true}
        className="w-full"
      />
    </LazyWrapper>
  );
});

export function TransactionsPage({
  transactions: initialTransactions,
  loading = false
}: TransactionsPageProps) {
  // Generate large dataset for demonstration - in real app, this would come from API
  const transactions = useMemo(() => 
    initialTransactions || generateMockTransactions(1000), 
    [initialTransactions]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (selectedCategory !== 'all' && txn.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'all' && txn.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedCategory, selectedStatus]);

  const categories = useMemo(() => 
    [...new Set(transactions.map(t => t.category))].sort(),
    [transactions]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">View and manage your transactions</p>
        </div>
        
        <div className="card animate-pulse">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600">View and manage your {transactions.length.toLocaleString()} transactions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input min-w-40"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input min-w-32"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      
      <div className="card p-0 overflow-hidden">
        <TransactionTable transactions={filteredTransactions} />
      </div>
    </div>
  )
}