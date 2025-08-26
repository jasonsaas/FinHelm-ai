import { useState, useCallback, useRef, useEffect } from 'react';
import { grokClient, GrokMessage } from '../lib/grok-client';

/**
 * Interface for preview request configuration
 */
export interface PreviewRequest {
  prompt: string;
  scenario?: FinancialScenario;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

/**
 * Financial scenarios for testing agent prompts
 */
export interface FinancialScenario {
  id: string;
  name: string;
  description: string;
  data: any;
  query: string;
  expectedResponse?: string;
}

/**
 * Preview response interface
 */
export interface PreviewResponse {
  id: string;
  content: string;
  timestamp: number;
  scenario?: FinancialScenario;
  tokensUsed?: number;
  executionTime?: number;
}

/**
 * Cache interface for storing preview results
 */
interface PreviewCache {
  [key: string]: {
    response: PreviewResponse;
    expiresAt: number;
  };
}

/**
 * Sample financial scenarios for testing prompts
 */
export const FINANCIAL_SCENARIOS: FinancialScenario[] = [
  {
    id: 'expense_report_analysis',
    name: 'Expense Report Analysis',
    description: 'Analyze expense report for compliance and optimization opportunities',
    query: 'Please analyze this expense report and identify any compliance issues or optimization opportunities',
    data: {
      expenseReport: {
        id: 'EXP-2024-001',
        submittedBy: 'John Smith',
        department: 'Sales',
        period: '2024-01',
        totalAmount: 2847.50,
        expenses: [
          { date: '2024-01-03', category: 'Meals & Entertainment', amount: 125.00, description: 'Client dinner - ABC Corp', receipt: true },
          { date: '2024-01-05', category: 'Transportation', amount: 47.50, description: 'Taxi to airport', receipt: true },
          { date: '2024-01-08', category: 'Lodging', amount: 285.00, description: 'Hotel - Chicago business trip', receipt: true },
          { date: '2024-01-10', category: 'Meals & Entertainment', amount: 95.00, description: 'Team lunch', receipt: false },
          { date: '2024-01-15', category: 'Office Supplies', amount: 127.50, description: 'Printer ink and paper', receipt: true },
          { date: '2024-01-18', category: 'Transportation', amount: 892.00, description: 'Flight to San Francisco', receipt: true },
          { date: '2024-01-22', category: 'Meals & Entertainment', amount: 165.00, description: 'Client meeting - XYZ Inc', receipt: true },
          { date: '2024-01-25', category: 'Miscellaneous', amount: 75.00, description: 'Conference materials', receipt: false },
          { date: '2024-01-28', category: 'Transportation', amount: 156.50, description: 'Car rental - 3 days', receipt: true },
          { date: '2024-01-30', category: 'Lodging', amount: 879.00, description: 'Hotel suite - San Francisco', receipt: true }
        ],
        policies: {
          mealLimit: 150.00,
          lodgingLimit: 300.00,
          receiptRequired: true,
          preApprovalRequired: true
        }
      }
    },
    expectedResponse: 'Policy violations detected: Hotel suite exceeds lodging limit ($879 vs $300 max). Missing receipts for team lunch ($95) and conference materials ($75). Consider pre-approval process for high-value items.'
  },
  {
    id: 'budget_variance_analysis',
    name: 'Budget Variance Analysis',
    description: 'Compare actual vs budget performance for Q1',
    query: 'Analyze the budget variance and explain the key drivers behind the differences',
    data: {
      budgetAnalysis: {
        period: 'Q1 2024',
        currency: 'USD',
        categories: [
          { name: 'Revenue', budget: 150000, actual: 164250, variance: 14250, variancePercent: 9.5 },
          { name: 'Salaries', budget: 85000, actual: 87500, variance: -2500, variancePercent: -2.9 },
          { name: 'Marketing', budget: 20000, actual: 15750, variance: 4250, variancePercent: 21.3 },
          { name: 'Office Expenses', budget: 8000, actual: 9200, variance: -1200, variancePercent: -15.0 },
          { name: 'Travel', budget: 12000, actual: 18500, variance: -6500, variancePercent: -54.2 },
          { name: 'Technology', budget: 15000, actual: 13800, variance: 1200, variancePercent: 8.0 },
          { name: 'Professional Services', budget: 5000, actual: 7250, variance: -2250, variancePercent: -45.0 }
        ],
        totals: {
          budgetRevenue: 150000,
          actualRevenue: 164250,
          budgetExpenses: 145000,
          actualExpenses: 152000,
          budgetNetIncome: 5000,
          actualNetIncome: 12250
        }
      }
    },
    expectedResponse: 'Strong revenue performance (+9.5%) offset by higher travel (+54.2%) and professional services (+45%) expenses. Net income exceeded budget by 145%. Focus on travel policy enforcement and service contract optimization.'
  },
  {
    id: 'cash_flow_forecast',
    name: 'Cash Flow Forecast',
    description: 'Project next quarter cash flow based on current trends',
    query: 'Based on the historical data, what is your cash flow forecast for the next quarter?',
    data: {
      cashFlowData: {
        historical: {
          'Jan 2024': { inflows: 45000, outflows: 38000, netFlow: 7000, endingBalance: 125000 },
          'Feb 2024': { inflows: 52000, outflows: 41000, netFlow: 11000, endingBalance: 136000 },
          'Mar 2024': { inflows: 48000, outflows: 43000, netFlow: 5000, endingBalance: 141000 },
          'Apr 2024': { inflows: 55000, outflows: 39000, netFlow: 16000, endingBalance: 157000 },
          'May 2024': { inflows: 49000, outflows: 44000, netFlow: 5000, endingBalance: 162000 },
          'Jun 2024': { inflows: 58000, outflows: 47000, netFlow: 11000, endingBalance: 173000 }
        },
        receivables: {
          current: 85000,
          outstanding30: 12000,
          outstanding60: 5500,
          outstanding90: 2200
        },
        payables: {
          current: 42000,
          due30: 18000,
          due60: 8500
        },
        seasonality: {
          Q1: 1.05,
          Q2: 0.98,
          Q3: 0.92,
          Q4: 1.15
        }
      }
    },
    expectedResponse: 'Q3 forecast: $145K average monthly inflows, $44K outflows, $101K net positive. Seasonal adjustment (-8%) suggests cautious approach. Monitor receivables aging and maintain 2-month expense buffer.'
  },
  {
    id: 'profit_margin_analysis',
    name: 'Profit Margin Analysis',
    description: 'Analyze profit margins by product line and identify improvement opportunities',
    query: 'Analyze profit margins by product and recommend strategies to improve overall profitability',
    data: {
      productProfitability: {
        products: [
          { 
            name: 'Premium Service Package', 
            revenue: 125000, 
            cogs: 45000, 
            grossProfit: 80000, 
            grossMargin: 64.0,
            unitsSold: 85,
            avgSellingPrice: 1470
          },
          { 
            name: 'Standard Service Package', 
            revenue: 185000, 
            cogs: 95000, 
            grossProfit: 90000, 
            grossMargin: 48.6,
            unitsSold: 247,
            avgSellingPrice: 750
          },
          { 
            name: 'Basic Service Package', 
            revenue: 95000, 
            cogs: 62000, 
            grossProfit: 33000, 
            grossMargin: 34.7,
            unitsSold: 380,
            avgSellingPrice: 250
          },
          { 
            name: 'Consulting Services', 
            revenue: 75000, 
            cogs: 25000, 
            grossProfit: 50000, 
            grossMargin: 66.7,
            unitsSold: 150,
            avgSellingPrice: 500
          }
        ],
        overheadAllocation: {
          totalOverhead: 125000,
          allocatedBySales: true
        },
        marketData: {
          industryMargin: 52.3,
          competitorPricing: {
            premium: 1600,
            standard: 780,
            basic: 225,
            consulting: 525
          }
        }
      }
    },
    expectedResponse: 'Premium and Consulting services show strongest margins (64%, 66.7%). Basic package underperforms at 34.7% margin. Recommend: focus on premium upsells, optimize basic package costs, or consider pricing adjustment to industry standards.'
  },
  {
    id: 'accounts_receivable_aging',
    name: 'Accounts Receivable Aging',
    description: 'Analyze AR aging and collection efficiency',
    query: 'Analyze the accounts receivable aging and recommend collection strategies',
    data: {
      arAging: {
        totalAR: 245000,
        agingBuckets: {
          current: { amount: 156000, percentage: 63.7, count: 45 },
          days30: { amount: 52000, percentage: 21.2, count: 18 },
          days60: { amount: 25000, percentage: 10.2, count: 8 },
          days90: { amount: 8500, percentage: 3.5, count: 4 },
          days120: { amount: 3500, percentage: 1.4, count: 2 }
        },
        topDelinquentAccounts: [
          { customer: 'ABC Manufacturing', amount: 15000, daysPastDue: 87, lastPayment: '2024-01-15' },
          { customer: 'Tech Solutions Inc', amount: 12500, daysPastDue: 65, lastPayment: '2024-02-01' },
          { customer: 'Global Services LLC', amount: 9800, daysPastDue: 95, lastPayment: '2024-01-05' },
          { customer: 'Premium Corp', amount: 7200, daysPastDue: 45, lastPayment: '2024-02-20' }
        ],
        collectionMetrics: {
          averageCollectionPeriod: 42,
          turnoverRatio: 8.7,
          badDebtRate: 2.1
        }
      }
    },
    expectedResponse: 'AR aging shows 15.1% past 60+ days requiring attention. Focus on ABC Manufacturing ($15K, 87 days) and Global Services ($9.8K, 95 days). Implement automated reminders at 30 days and escalation procedures at 60+ days.'
  }
];

/**
 * Custom hook for Grok AI preview functionality
 */
export function useGrokPreview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [cache, setCache] = useState<PreviewCache>({});
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache expiration time (5 minutes)
  const CACHE_EXPIRATION = 5 * 60 * 1000;
  
  // Generate cache key based on request parameters
  const generateCacheKey = useCallback((request: PreviewRequest): string => {
    const { prompt, scenario, model, temperature } = request;
    return btoa(
      JSON.stringify({
        prompt: prompt.substring(0, 200), // Limit prompt length for cache key
        scenarioId: scenario?.id,
        model: model || 'grok-beta',
        temperature: temperature || 0.7
      })
    );
  }, []);

  // Check if cache entry is still valid
  const isCacheValid = useCallback((cacheKey: string): boolean => {
    const cached = cache[cacheKey];
    return cached && cached.expiresAt > Date.now();
  }, [cache]);

  // Get cached response if available and valid
  const getCachedResponse = useCallback((cacheKey: string): PreviewResponse | null => {
    return isCacheValid(cacheKey) ? cache[cacheKey].response : null;
  }, [cache, isCacheValid]);

  // Store response in cache
  const cacheResponse = useCallback((cacheKey: string, response: PreviewResponse) => {
    setCache(prev => ({
      ...prev,
      [cacheKey]: {
        response,
        expiresAt: Date.now() + CACHE_EXPIRATION
      }
    }));
  }, [CACHE_EXPIRATION]);

  // Clean expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    setCache(prev => {
      const cleaned = { ...prev };
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key].expiresAt <= now) {
          delete cleaned[key];
        }
      });
      return cleaned;
    });
  }, []);

  // Clean cache periodically
  useEffect(() => {
    const interval = setInterval(cleanCache, 60 * 1000); // Clean every minute
    return () => clearInterval(interval);
  }, [cleanCache]);

  // Generate preview with debouncing
  const generatePreview = useCallback(async (request: PreviewRequest, debounceMs: number = 1000) => {
    // Cancel previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    return new Promise<PreviewResponse | null>((resolve, reject) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await executePreview(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounceMs);
    });
  }, []);

  // Execute the actual preview request
  const executePreview = useCallback(async (request: PreviewRequest): Promise<PreviewResponse> => {
    const startTime = Date.now();
    const { prompt, scenario, model = 'grok-beta', temperature = 0.7, maxTokens = 1500, useCache = true } = request;

    // Validate inputs
    if (!prompt || prompt.trim().length < 20) {
      throw new Error('Prompt must be at least 20 characters long');
    }

    // Check cache first if enabled
    const cacheKey = generateCacheKey(request);
    if (useCache) {
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        setPreview(cachedResponse);
        setError(null);
        return cachedResponse;
      }
    }

    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Prepare messages for Grok
      const messages: GrokMessage[] = [
        {
          role: 'system',
          content: `${prompt}

You are now configured as described above. Please respond as this AI agent would respond to the following scenario.
Be specific, actionable, and demonstrate the capabilities defined in your prompt.
Format your response clearly and provide concrete insights based on the data provided.`
        }
      ];

      // Add scenario data if provided
      if (scenario) {
        messages.push({
          role: 'user',
          content: `${scenario.query}

Context and Data:
${JSON.stringify(scenario.data, null, 2)}

Please analyze this data according to your agent configuration and provide specific insights and recommendations.`
        });
      } else {
        // Use a generic financial query if no scenario is provided
        messages.push({
          role: 'user',
          content: `Please provide a sample analysis demonstrating your capabilities. You can use hypothetical financial data to show how you would analyze and provide insights.`
        });
      }

      // Make the Grok API call
      const response = await grokClient.chat({
        messages,
        model,
        temperature,
        max_tokens: maxTokens
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('No response content received from Grok API');
      }

      const previewResponse: PreviewResponse = {
        id: `preview_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        content: response.choices[0].message.content,
        timestamp: Date.now(),
        scenario,
        tokensUsed: response.usage?.total_tokens,
        executionTime: Date.now() - startTime
      };

      // Cache the response if caching is enabled
      if (useCache) {
        cacheResponse(cacheKey, previewResponse);
      }

      setPreview(previewResponse);
      setError(null);
      
      return previewResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [generateCacheKey, getCachedResponse, cacheResponse]);

  // Generate preview with specific scenario
  const generatePreviewWithScenario = useCallback(async (
    prompt: string, 
    scenarioId: string, 
    options?: Partial<PreviewRequest>
  ) => {
    const scenario = FINANCIAL_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    return generatePreview({
      prompt,
      scenario,
      ...options
    });
  }, [generatePreview]);

  // Cancel any ongoing preview request
  const cancelPreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  }, []);

  // Clear preview and error state
  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const entries = Object.keys(cache).length;
    const validEntries = Object.keys(cache).filter(key => isCacheValid(key)).length;
    const totalSize = JSON.stringify(cache).length;
    
    return {
      totalEntries: entries,
      validEntries,
      expiredEntries: entries - validEntries,
      totalSizeBytes: totalSize
    };
  }, [cache, isCacheValid]);

  // Clear all cached responses
  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  return {
    // State
    isLoading,
    error,
    preview,

    // Actions
    generatePreview,
    generatePreviewWithScenario,
    cancelPreview,
    clearPreview,

    // Cache management
    getCacheStats,
    clearCache,

    // Utilities
    scenarios: FINANCIAL_SCENARIOS,
    isDebouncing: debounceTimeoutRef.current !== undefined
  };
}

export default useGrokPreview;