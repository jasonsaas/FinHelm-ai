"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Building2,
  Calendar,
  TrendingUp as TrendingUpIcon,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

// Mock data with Sage Intacct terminology
const mockEntities = [
  { id: 1, name: "West Coast Operations", revenue: 2450000, expenses: 1850000, lastSync: "2024-08-26" },
  { id: 2, name: "East Coast Operations", revenue: 3200000, expenses: 2100000, lastSync: "2024-08-26" },
  { id: 3, name: "Central Region", revenue: 1850000, expenses: 1200000, lastSync: "2024-08-26" },
  { id: 4, name: "International Division", revenue: 4100000, expenses: 2900000, lastSync: "2024-08-25" },
];

const mockTransactions = [
  { id: 1, date: "2024-08-26", description: "Q3 Revenue - West Coast", amount: 125000, entity: "West Coast Operations" },
  { id: 2, date: "2024-08-26", description: "Marketing Campaign - Digital", amount: -15000, entity: "Central Region" },
  { id: 3, date: "2024-08-25", description: "Equipment Purchase", amount: -45000, entity: "International Division" },
  { id: 4, date: "2024-08-25", description: "Professional Services", amount: -8500, entity: "East Coast Operations" },
  { id: 5, date: "2024-08-24", description: "Client Payment - Enterprise", amount: 75000, entity: "International Division" },
];

// Animated counter hook
function useAnimatedNumber(end: number, duration: number = 2000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.floor(end * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return current;
}

export default function Dashboard() {
  const { user } = useUser();

  // Calculate totals from entities
  const totalAssets = mockEntities.reduce((sum, entity) => sum + (entity.revenue * 0.6), 0); // Estimate
  const totalLiabilities = mockEntities.reduce((sum, entity) => sum + (entity.expenses * 0.3), 0); // Estimate  
  const totalRevenue = mockEntities.reduce((sum, entity) => sum + entity.revenue, 0);
  const totalExpenses = mockEntities.reduce((sum, entity) => sum + entity.expenses, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Animated values
  const animatedAssets = useAnimatedNumber(totalAssets);
  const animatedLiabilities = useAnimatedNumber(totalLiabilities);
  const animatedRevenue = useAnimatedNumber(totalRevenue);
  const animatedNetIncome = useAnimatedNumber(netIncome);

  // Mock trends (positive/negative changes)
  const trends = {
    assets: { value: 12.5, isPositive: true },
    liabilities: { value: -8.3, isPositive: true },
    revenue: { value: 18.7, isPositive: true },
    netIncome: { value: 24.2, isPositive: true }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sage-dark">
              Welcome back, {user?.firstName || "Financial Analyst"}
            </h2>
            <p className="text-sage-gray mt-1">
              Here&apos;s what&apos;s happening with your Sage Intacct data today
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {getCurrentDate()}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Assets */}
        <div className="bg-white rounded-lg shadow-lg border p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-sage-gray" />
                <p className="text-sm font-medium text-sage-gray">Total Assets</p>
              </div>
              <p className="text-3xl font-bold text-sage-dark mb-1">
                ${(animatedAssets / 1000000).toFixed(1)}M
              </p>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-success-green" />
                <span className="text-sm font-medium text-success-green">
                  +{trends.assets.value}%
                </span>
                <span className="text-xs text-sage-gray">vs last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="bg-white rounded-lg shadow-lg border p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-sage-gray" />
                <p className="text-sm font-medium text-sage-gray">Total Liabilities</p>
              </div>
              <p className="text-3xl font-bold text-sage-dark mb-1">
                ${(animatedLiabilities / 1000000).toFixed(1)}M
              </p>
              <div className="flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4 text-success-green" />
                <span className="text-sm font-medium text-success-green">
                  {trends.liabilities.value}%
                </span>
                <span className="text-xs text-sage-gray">vs last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue YTD */}
        <div className="bg-white rounded-lg shadow-lg border p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-sage-gray" />
                <p className="text-sm font-medium text-sage-gray">Revenue YTD</p>
              </div>
              <p className="text-3xl font-bold text-sage-dark mb-1">
                ${(animatedRevenue / 1000000).toFixed(1)}M
              </p>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-success-green" />
                <span className="text-sm font-medium text-success-green">
                  +{trends.revenue.value}%
                </span>
                <span className="text-xs text-sage-gray">vs last year</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-white rounded-lg shadow-lg border p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-sage-gray" />
                <p className="text-sm font-medium text-sage-gray">Net Income</p>
              </div>
              <p className="text-3xl font-bold text-sage-dark mb-1">
                ${(animatedNetIncome / 1000000).toFixed(1)}M
              </p>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-success-green" />
                <span className="text-sm font-medium text-success-green">
                  +{trends.netIncome.value}%
                </span>
                <span className="text-xs text-sage-gray">vs last quarter</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-sage-dark">Recent Transactions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sage-dark">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-sage-gray">
                      {transaction.entity} • {transaction.date}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Entities by Revenue */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-sage-dark">Top Entities by Revenue</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockEntities
                .sort((a, b) => b.revenue - a.revenue)
                .map((entity, index) => {
                  const profit = entity.revenue - entity.expenses;
                  const profitMargin = ((profit / entity.revenue) * 100);
                  
                  return (
                    <div key={entity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium ${
                          index === 0 ? 'bg-sage-green' : 
                          index === 1 ? 'bg-sage-gray' : 
                          index === 2 ? 'bg-sage-orange' : 'bg-sage-teal'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sage-dark">{entity.name}</p>
                          <p className="text-xs text-sage-gray">
                            {profitMargin.toFixed(1)}% margin
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-sage-dark">
                          ${(entity.revenue / 1000000).toFixed(1)}M
                        </p>
                        <p className={`text-xs ${profit > 0 ? 'text-success-green' : 'text-error-red'}`}>
                          ${(profit / 1000000).toFixed(1)}M profit
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}