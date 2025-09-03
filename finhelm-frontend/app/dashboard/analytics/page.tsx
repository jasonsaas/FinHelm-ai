"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Download,
  Settings,
  PieChart,
  LineChart,
  Activity
} from "lucide-react";

// Advanced Analytics Dashboard with CFO-level insights
export default function AnalyticsPage() {
  const { user } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState("90d");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Mock advanced analytics data
  const analyticsData = {
    cohortAnalysis: [
      { cohort: "Jan 2024", month1: 100, month2: 85, month3: 78, month4: 72, month5: 68, month6: 65 },
      { cohort: "Feb 2024", month1: 100, month2: 88, month3: 81, month4: 75, month5: 71 },
      { cohort: "Mar 2024", month1: 100, month2: 82, month3: 76, month4: 70 },
      { cohort: "Apr 2024", month1: 100, month2: 90, month3: 83 },
      { cohort: "May 2024", month1: 100, month2: 87 },
      { cohort: "Jun 2024", month1: 100 },
    ],
    customerConcentration: [
      { customer: "Enterprise Corp", revenue: 2500000, percentage: 35.2, risk: "high" },
      { customer: "Global Solutions", revenue: 1800000, percentage: 25.4, risk: "medium" },
      { customer: "Tech Innovations", revenue: 950000, percentage: 13.4, risk: "low" },
      { customer: "Digital Dynamics", revenue: 650000, percentage: 9.2, risk: "low" },
      { customer: "Others (45 customers)", revenue: 1200000, percentage: 16.8, risk: "low" },
    ],
    workingCapitalMetrics: {
      currentRatio: 2.4,
      quickRatio: 1.8,
      cashRatio: 0.9,
      dso: 42,
      dpo: 28,
      dio: 15,
      cashConversionCycle: 29,
      workingCapital: 4500000,
      suggestions: [
        { type: "collection", description: "Accelerate collections to reduce DSO by 5 days", impact: "$125K cash improvement" },
        { type: "payment", description: "Negotiate 15-day payment term extension", impact: "$89K cash improvement" },
        { type: "inventory", description: "Optimize inventory levels", impact: "$45K working capital reduction" },
      ]
    },
    burnRateMultiple: {
      currentBurnRate: 450000,
      targetBurnRate: 380000,
      multiple: 1.18,
      cashRunway: 14.2,
      recommendation: "moderate",
      trends: [
        { month: "Jan", burnRate: 420000, multiple: 1.11 },
        { month: "Feb", burnRate: 435000, multiple: 1.14 },
        { month: "Mar", burnRate: 445000, multiple: 1.17 },
        { month: "Apr", burnRate: 450000, multiple: 1.18 },
        { month: "May", burnRate: 455000, multiple: 1.20 },
        { month: "Jun", burnRate: 450000, multiple: 1.18 },
      ]
    },
    ltvCacRatio: {
      ltv: 125000,
      cac: 8500,
      ratio: 14.7,
      benchmark: 15,
      status: "good",
      paybackPeriod: 11.2,
      trends: [
        { period: "Q1 2023", ratio: 12.3 },
        { period: "Q2 2023", ratio: 13.8 },
        { period: "Q3 2023", ratio: 14.1 },
        { period: "Q4 2023", ratio: 14.5 },
        { period: "Q1 2024", ratio: 14.7 },
      ]
    },
    scenarioModeling: {
      baseCase: { revenue: 12500000, expenses: 9200000, netIncome: 3300000 },
      optimistic: { revenue: 14000000, expenses: 9800000, netIncome: 4200000 },
      pessimistic: { revenue: 10500000, expenses: 8900000, netIncome: 1600000 },
    },
    sensitivityAnalysis: [
      { variable: "Revenue Growth", impact: 0.85, description: "10% change = $1.25M impact" },
      { variable: "Customer Acquisition Cost", impact: 0.62, description: "10% change = $520K impact" },
      { variable: "Churn Rate", impact: -0.73, description: "1% change = $430K impact" },
      { variable: "Average Deal Size", impact: 0.91, description: "10% change = $890K impact" },
    ]
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sage-dark">Advanced Analytics</h2>
            <p className="text-sage-gray mt-1">
              CFO-level insights and predictive analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
              <option value="ytd">Year to date</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-sage-green text-white rounded-md text-sm font-medium hover:bg-sage-green/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Customer Concentration Risk</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">35.2%</div>
          <div className="flex items-center gap-1 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-600">High risk - Top customer dependency</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Cash Conversion Cycle</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">29 days</div>
          <div className="flex items-center gap-1 text-sm">
            <ArrowDownRight className="h-4 w-4 text-green-500" />
            <span className="text-green-600">-3 days vs industry avg</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">LTV/CAC Ratio</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">14.7x</div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Above 15x target</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Burn Rate Multiple</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">1.18x</div>
          <div className="flex items-center gap-1 text-sm">
            <ArrowUpRight className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-600">18% above target</span>
          </div>
        </div>
      </div>

      {/* Cohort Analysis */}
      <div className="bg-white rounded-lg shadow-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-sage-dark">Revenue Cohort Analysis</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <PieChart className="h-4 w-4" />
              Customer retention by cohort
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Cohort</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 1</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 2</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 3</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 4</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 5</th>
                  <th className="text-center py-2 font-medium text-gray-600">Month 6</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.cohortAnalysis.map((cohort, index) => (
                  <tr key={cohort.cohort} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{cohort.cohort}</td>
                    <td className="text-center py-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        {cohort.month1}%
                      </span>
                    </td>
                    {[cohort.month2, cohort.month3, cohort.month4, cohort.month5, cohort.month6].map((value, i) => (
                      <td key={i} className="text-center py-2">
                        {value ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            value >= 80 ? 'bg-green-100 text-green-800' :
                            value >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {value}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Concentration Risk */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-sage-dark">Customer Concentration Risk</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.customerConcentration.map((customer, index) => (
                <div key={customer.customer} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sage-dark">{customer.customer}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-sage-green h-2 rounded-full" 
                          style={{ width: `${customer.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{customer.percentage}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(customer.revenue)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(customer.risk)}`}>
                      {customer.risk} risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Working Capital Optimization */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-sage-dark">Working Capital Optimization</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Current Ratio</p>
                <p className="text-xl font-bold text-blue-600">
                  {analyticsData.workingCapitalMetrics.currentRatio}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Quick Ratio</p>
                <p className="text-xl font-bold text-green-600">
                  {analyticsData.workingCapitalMetrics.quickRatio}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">DSO</p>
                <p className="text-xl font-bold text-purple-600">
                  {analyticsData.workingCapitalMetrics.dso} days
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Cash Cycle</p>
                <p className="text-xl font-bold text-orange-600">
                  {analyticsData.workingCapitalMetrics.cashConversionCycle} days
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sage-dark">Optimization Suggestions</h4>
              {analyticsData.workingCapitalMetrics.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-sm font-medium text-gray-900">{suggestion.description}</p>
                  <p className="text-xs text-green-600 mt-1">Impact: {suggestion.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Modeling & Sensitivity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Modeling */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sage-dark">Scenario Modeling</h3>
              <button className="flex items-center gap-1 text-sm text-sage-green hover:text-sage-green/80">
                <Settings className="h-4 w-4" />
                Configure
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 border-2 border-sage-green rounded-lg bg-sage-green/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sage-dark">Base Case</span>
                  <span className="text-xs bg-sage-green text-white px-2 py-1 rounded">Current</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.baseCase.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.baseCase.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Income</p>
                    <p className="font-semibold text-green-600">{formatCurrency(analyticsData.scenarioModeling.baseCase.netIncome)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sage-dark">Optimistic</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">+20% growth</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.optimistic.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.optimistic.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Income</p>
                    <p className="font-semibold text-green-600">{formatCurrency(analyticsData.scenarioModeling.optimistic.netIncome)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sage-dark">Pessimistic</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">-15% decline</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.pessimistic.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="font-semibold">{formatCurrency(analyticsData.scenarioModeling.pessimistic.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Income</p>
                    <p className="font-semibold text-yellow-600">{formatCurrency(analyticsData.scenarioModeling.pessimistic.netIncome)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sensitivity Analysis */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-sage-dark">Sensitivity Analysis</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.sensitivityAnalysis.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sage-dark">{item.variable}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          Math.abs(item.impact) > 0.8 ? 'bg-red-500' :
                          Math.abs(item.impact) > 0.6 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.abs(item.impact) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${
                      item.impact > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.impact > 0 ? '+' : ''}{(item.impact * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Break-even Calculator */}
      <div className="bg-white rounded-lg shadow-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-sage-dark">Break-even Calculator</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 text-sm text-sage-green hover:text-sage-green/80">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Costs (Monthly)</label>
                <input 
                  type="number" 
                  defaultValue="380000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sage-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variable Cost per Unit</label>
                <input 
                  type="number" 
                  defaultValue="45"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sage-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price per Unit</label>
                <input 
                  type="number" 
                  defaultValue="125"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sage-green"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-sage-green mb-2">4,750</div>
                <div className="text-sm text-gray-600">Units to Break-even</div>
                <div className="text-xs text-gray-500 mt-1">At current pricing</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Break-even Revenue</div>
                <div className="text-xl font-bold text-blue-600">$593,750</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Contribution Margin</div>
                <div className="text-xl font-bold text-green-600">64%</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Margin of Safety</div>
                <div className="text-xl font-bold text-purple-600">22%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}