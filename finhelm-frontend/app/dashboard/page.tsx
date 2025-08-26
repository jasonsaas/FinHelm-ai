"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Users,
  MessageCircle,
  Settings,
  BarChart3
} from "lucide-react";

const mockAccounts = [
  { id: 1, name: "Cash", balance: 25000, type: "Asset", lastSync: "2024-08-26" },
  { id: 2, name: "Accounts Receivable", balance: 15000, type: "Asset", lastSync: "2024-08-26" },
  { id: 3, name: "Inventory", balance: 50000, type: "Asset", lastSync: "2024-08-25" },
  { id: 4, name: "Equipment", balance: 75000, type: "Asset", lastSync: "2024-08-26" },
  { id: 5, name: "Accounts Payable", balance: -12000, type: "Liability", lastSync: "2024-08-26" },
  { id: 6, name: "Sales Revenue", balance: -95000, type: "Revenue", lastSync: "2024-08-26" },
  { id: 7, name: "Office Expenses", balance: 8500, type: "Expense", lastSync: "2024-08-25" },
  { id: 8, name: "Marketing Costs", balance: 12000, type: "Expense", lastSync: "2024-08-26" },
  { id: 9, name: "Utilities", balance: 3200, type: "Expense", lastSync: "2024-08-26" },
  { id: 10, name: "Professional Services", balance: 6800, type: "Expense", lastSync: "2024-08-25" },
];

export default function Dashboard() {
  const { user } = useUser();

  const totalAssets = mockAccounts
    .filter(acc => acc.type === "Asset")
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalLiabilities = Math.abs(mockAccounts
    .filter(acc => acc.type === "Liability")
    .reduce((sum, acc) => sum + acc.balance, 0));

  const totalRevenue = Math.abs(mockAccounts
    .filter(acc => acc.type === "Revenue")
    .reduce((sum, acc) => sum + acc.balance, 0));

  const totalExpenses = mockAccounts
    .filter(acc => acc.type === "Expense")
    .reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FinHelm.ai Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/chat"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <MessageCircle className="h-4 w-4" />
                Chat Assistant
              </Link>
              <div className="text-sm text-gray-600">
                Welcome, {user?.firstName || "User"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalAssets.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalLiabilities.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">QuickBooks Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sync
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.type === "Asset" ? "bg-green-100 text-green-800" :
                        account.type === "Liability" ? "bg-red-100 text-red-800" :
                        account.type === "Revenue" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={account.balance < 0 ? "text-red-600" : "text-gray-900"}>
                        ${Math.abs(account.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.lastSync}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}