import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Vertical-Specific AI Agents for FinHelm.ai
 * Specialized agents for different business verticals
 */

// Base Agent Interface
export interface BaseAgent {
  organizationId: string;
  vertical: string;
  config: {
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    alertThresholds: {
      high: number;
      medium: number;
      low: number;
    };
    reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    customMetrics?: string[];
  };
}

export interface AgentInsight {
  type: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  impact: {
    financial: number; // Dollar amount
    operational: string;
    compliance: string;
  };
  recommendations: {
    action: string;
    priority: 'immediate' | 'short_term' | 'long_term';
    implementation: string;
    expectedOutcome: string;
  }[];
  data: {
    metrics: Array<{ name: string; value: any; trend: 'up' | 'down' | 'flat' }>;
    charts?: Array<{ type: string; data: any[] }>;
    comparisons?: Array<{ period: string; value: number; change: number }>;
  };
}

/**
 * Base Agent Class - Common functionality for all vertical agents
 */
export abstract class BaseAgentClass implements BaseAgent {
  organizationId: string;
  vertical: string;
  config: BaseAgent['config'];

  constructor(organizationId: string, vertical: string, config: BaseAgent['config']) {
    this.organizationId = organizationId;
    this.vertical = vertical;
    this.config = config;
  }

  // Abstract method that all vertical agents must implement
  abstract analyze(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight[]>;

  // Common utility methods
  protected async getTransactionsByLocation(ctx: any, locationId?: string): Promise<any[]> {
    const query = ctx.db
      .query("transactions")
      .filter((q: any) => q.eq(q.field("organizationId"), this.organizationId));
    
    if (locationId) {
      query.filter((q: any) => q.eq(q.field("locationId"), locationId));
    }
    
    return await query.collect();
  }

  protected async getAccountsByType(ctx: any, accountType: string): Promise<any[]> {
    return await ctx.db
      .query("accounts")
      .filter((q: any) => 
        q.and(
          q.eq(q.field("organizationId"), this.organizationId),
          q.eq(q.field("type"), accountType)
        )
      )
      .collect();
  }

  protected calculateVariance(actual: number, budget: number): { variance: number; percentChange: number } {
    const variance = actual - budget;
    const percentChange = budget !== 0 ? (variance / budget) * 100 : 0;
    return { variance, percentChange };
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  protected getTrendDirection(current: number, previous: number): 'up' | 'down' | 'flat' {
    const threshold = 0.05; // 5% threshold for significant change
    const change = Math.abs((current - previous) / previous);
    
    if (change < threshold) return 'flat';
    return current > previous ? 'up' : 'down';
  }
}

/**
 * Franchise Variance Agent
 * Analyzes variance across franchise locations, identifies outliers and trends
 */
export class FranchiseVarianceAgent extends BaseAgentClass {
  constructor(organizationId: string, config: BaseAgent['config']) {
    super(organizationId, 'franchise', config);
  }

  async analyze(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight[]> {
    const insights: AgentInsight[] = [];

    try {
      // Get all locations for this franchise organization
      const locations = await this.getFranchiseLocations(ctx);
      
      if (locations.length === 0) {
        return [{
          type: 'franchise_setup',
          title: 'No Franchise Locations Found',
          description: 'No locations have been configured for franchise analysis.',
          severity: 'medium',
          confidence: 100,
          impact: {
            financial: 0,
            operational: 'Cannot perform franchise variance analysis without location data',
            compliance: 'Location tracking may be required for franchise reporting'
          },
          recommendations: [{
            action: 'Configure franchise locations in system settings',
            priority: 'short_term',
            implementation: 'Add location codes to transactions and set up location master data',
            expectedOutcome: 'Enable comprehensive franchise performance analysis'
          }],
          data: {
            metrics: [
              { name: 'Total Locations', value: 0, trend: 'flat' },
              { name: 'Configured Locations', value: 0, trend: 'flat' }
            ]
          }
        }];
      }

      // Analyze revenue variance by location
      const revenueVariance = await this.analyzeRevenueVariance(ctx, locations, dateRange);
      if (revenueVariance) insights.push(revenueVariance);

      // Analyze expense efficiency across locations
      const expenseEfficiency = await this.analyzeExpenseEfficiency(ctx, locations, dateRange);
      if (expenseEfficiency) insights.push(expenseEfficiency);

      // Identify underperforming locations
      const underperformers = await this.identifyUnderperformingLocations(ctx, locations, dateRange);
      if (underperformers) insights.push(underperformers);

      // Analyze same-store sales growth
      const sameStoreSales = await this.analyzeSameStoreSalesGrowth(ctx, locations, dateRange);
      if (sameStoreSales) insights.push(sameStoreSales);

    } catch (error) {
      console.error('Franchise variance analysis failed:', error);
      insights.push({
        type: 'analysis_error',
        title: 'Franchise Analysis Error',
        description: `Failed to complete franchise variance analysis: ${error}`,
        severity: 'high',
        confidence: 100,
        impact: {
          financial: 0,
          operational: 'Franchise performance monitoring is unavailable',
          compliance: 'May impact franchise reporting requirements'
        },
        recommendations: [{
          action: 'Review data quality and system configuration',
          priority: 'immediate',
          implementation: 'Check transaction data completeness and location mapping',
          expectedOutcome: 'Restore franchise performance monitoring capabilities'
        }],
        data: {
          metrics: []
        }
      });
    }

    return insights;
  }

  private async getFranchiseLocations(ctx: any): Promise<string[]> {
    // Get distinct location IDs from transactions
    const transactions = await this.getTransactionsByLocation(ctx);
    const locationIds = [...new Set(transactions
      .map(t => t.locationId)
      .filter(id => id && id !== null)
    )];
    
    return locationIds as string[];
  }

  private async analyzeRevenueVariance(ctx: any, locations: string[], dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    const locationRevenues: Array<{ locationId: string; revenue: number; transactionCount: number }> = [];

    for (const locationId of locations) {
      const transactions = await this.getTransactionsByLocation(ctx, locationId);
      const relevantTxns = transactions.filter(t => 
        t.transactionDate >= dateRange.start && 
        t.transactionDate <= dateRange.end &&
        t.type === 'invoice'
      );
      
      const revenue = relevantTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      locationRevenues.push({
        locationId,
        revenue,
        transactionCount: relevantTxns.length
      });
    }

    if (locationRevenues.length < 2) return null;

    // Calculate statistics
    const revenues = locationRevenues.map(l => l.revenue);
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;

    // Identify outliers (locations > 2 standard deviations from mean)
    const outliers = locationRevenues.filter(l => 
      Math.abs(l.revenue - avgRevenue) > 2 * stdDev
    );

    const severity: 'high' | 'medium' | 'low' = 
      coefficientOfVariation > 30 ? 'high' : 
      coefficientOfVariation > 15 ? 'medium' : 'low';

    return {
      type: 'franchise_revenue_variance',
      title: 'Franchise Revenue Variance Analysis',
      description: `Revenue variance across ${locations.length} locations shows ${severity} variability (CV: ${coefficientOfVariation.toFixed(1)}%)`,
      severity,
      confidence: 85,
      impact: {
        financial: maxRevenue - minRevenue,
        operational: `${outliers.length} locations show significant deviation from average performance`,
        compliance: coefficientOfVariation > 25 ? 'High variance may require franchise performance review' : 'Within acceptable franchise performance range'
      },
      recommendations: [
        {
          action: outliers.length > 0 ? 'Investigate underperforming locations' : 'Maintain current performance monitoring',
          priority: outliers.length > 2 ? 'immediate' : 'short_term',
          implementation: 'Review operations, marketing, and local factors for outlier locations',
          expectedOutcome: 'Improve consistency across franchise network'
        },
        {
          action: 'Implement best practices sharing program',
          priority: 'long_term',
          implementation: 'Share strategies from top-performing locations with others',
          expectedOutcome: 'Increase average revenue and reduce variance'
        }
      ],
      data: {
        metrics: [
          { name: 'Average Revenue', value: this.formatCurrency(avgRevenue), trend: 'flat' },
          { name: 'Revenue Range', value: `${this.formatCurrency(minRevenue)} - ${this.formatCurrency(maxRevenue)}`, trend: 'flat' },
          { name: 'Coefficient of Variation', value: `${coefficientOfVariation.toFixed(1)}%`, trend: 'flat' },
          { name: 'Outlier Locations', value: outliers.length, trend: 'flat' }
        ],
        charts: [{
          type: 'bar',
          data: locationRevenues.map(l => ({
            location: l.locationId,
            revenue: l.revenue,
            isOutlier: outliers.some(o => o.locationId === l.locationId)
          }))
        }]
      }
    };
  }

  private async analyzeExpenseEfficiency(ctx: any, locations: string[], dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    const locationExpenses: Array<{ locationId: string; expenses: number; revenue: number; ratio: number }> = [];

    for (const locationId of locations) {
      const transactions = await this.getTransactionsByLocation(ctx, locationId);
      const relevantTxns = transactions.filter(t => 
        t.transactionDate >= dateRange.start && 
        t.transactionDate <= dateRange.end
      );
      
      const expenses = relevantTxns
        .filter(t => t.type === 'bill' || t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const revenue = relevantTxns
        .filter(t => t.type === 'invoice')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const ratio = revenue > 0 ? (expenses / revenue) * 100 : 0;
      
      locationExpenses.push({
        locationId,
        expenses,
        revenue,
        ratio
      });
    }

    if (locationExpenses.length === 0) return null;

    const ratios = locationExpenses.map(l => l.ratio).filter(r => r > 0);
    if (ratios.length === 0) return null;

    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    const maxRatio = Math.max(...ratios);
    const minRatio = Math.min(...ratios);
    
    const inefficientLocations = locationExpenses.filter(l => l.ratio > avgRatio * 1.2);

    const severity: 'high' | 'medium' | 'low' = 
      maxRatio > avgRatio * 1.5 ? 'high' : 
      maxRatio > avgRatio * 1.2 ? 'medium' : 'low';

    return {
      type: 'franchise_expense_efficiency',
      title: 'Franchise Expense Efficiency Analysis',
      description: `Expense-to-revenue ratios vary from ${minRatio.toFixed(1)}% to ${maxRatio.toFixed(1)}% across locations`,
      severity,
      confidence: 80,
      impact: {
        financial: inefficientLocations.reduce((sum, l) => sum + l.expenses * 0.1, 0), // Estimate 10% savings potential
        operational: `${inefficientLocations.length} locations show above-average expense ratios`,
        compliance: 'May impact franchise profitability requirements'
      },
      recommendations: [
        {
          action: 'Review expense management at inefficient locations',
          priority: inefficientLocations.length > 0 ? 'short_term' : 'long_term',
          implementation: 'Analyze cost drivers and implement cost control measures',
          expectedOutcome: 'Reduce expense ratios to franchise average'
        }
      ],
      data: {
        metrics: [
          { name: 'Average Expense Ratio', value: `${avgRatio.toFixed(1)}%`, trend: 'flat' },
          { name: 'Best Performing Location', value: `${minRatio.toFixed(1)}%`, trend: 'down' },
          { name: 'Least Efficient Location', value: `${maxRatio.toFixed(1)}%`, trend: 'up' },
          { name: 'Locations Above Average', value: inefficientLocations.length, trend: 'flat' }
        ]
      }
    };
  }

  private async identifyUnderperformingLocations(ctx: any, locations: string[], dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Implementation for identifying underperforming locations
    // This would compare each location's performance against franchise averages
    // For now, returning a placeholder insight
    return {
      type: 'franchise_underperformers',
      title: 'Underperforming Location Analysis',
      description: 'Analysis of locations performing below franchise benchmarks',
      severity: 'medium',
      confidence: 75,
      impact: {
        financial: 0,
        operational: 'Systematic analysis in development',
        compliance: 'Placeholder for franchise performance tracking'
      },
      recommendations: [{
        action: 'Complete underperformer identification algorithm',
        priority: 'short_term',
        implementation: 'Implement comprehensive location benchmarking',
        expectedOutcome: 'Identify and support struggling franchise locations'
      }],
      data: {
        metrics: [
          { name: 'Locations Analyzed', value: locations.length, trend: 'flat' }
        ]
      }
    };
  }

  private async analyzeSameStoreSalesGrowth(ctx: any, locations: string[], dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Implementation for same-store sales growth analysis
    // This would compare current period to previous period for the same locations
    return {
      type: 'franchise_same_store_growth',
      title: 'Same-Store Sales Growth',
      description: 'Year-over-year growth analysis for established locations',
      severity: 'low',
      confidence: 70,
      impact: {
        financial: 0,
        operational: 'Growth tracking in development',
        compliance: 'Standard franchise metric tracking'
      },
      recommendations: [{
        action: 'Implement historical comparison logic',
        priority: 'short_term',
        implementation: 'Compare same locations across time periods',
        expectedOutcome: 'Track franchise network maturity and growth'
      }],
      data: {
        metrics: [
          { name: 'Eligible Locations', value: locations.length, trend: 'flat' }
        ]
      }
    };
  }
}

/**
 * Retail Inventory Agent
 * Analyzes inventory levels, turnover, and optimization opportunities
 */
export class RetailInventoryAgent extends BaseAgentClass {
  constructor(organizationId: string, config: BaseAgent['config']) {
    super(organizationId, 'retail', config);
  }

  async analyze(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight[]> {
    const insights: AgentInsight[] = [];

    try {
      // Analyze inventory turnover
      const inventoryTurnover = await this.analyzeInventoryTurnover(ctx, dateRange);
      if (inventoryTurnover) insights.push(inventoryTurnover);

      // Identify slow-moving inventory
      const slowMovingInventory = await this.identifySlowMovingInventory(ctx, dateRange);
      if (slowMovingInventory) insights.push(slowMovingInventory);

      // Analyze stockouts and overstock situations
      const stockLevelAnalysis = await this.analyzeStockLevels(ctx, dateRange);
      if (stockLevelAnalysis) insights.push(stockLevelAnalysis);

      // Seasonal trend analysis
      const seasonalTrends = await this.analyzeSeasonalTrends(ctx, dateRange);
      if (seasonalTrends) insights.push(seasonalTrends);

    } catch (error) {
      console.error('Retail inventory analysis failed:', error);
      insights.push({
        type: 'analysis_error',
        title: 'Retail Inventory Analysis Error',
        description: `Failed to complete inventory analysis: ${error}`,
        severity: 'high',
        confidence: 100,
        impact: {
          financial: 0,
          operational: 'Inventory optimization is unavailable',
          compliance: 'May impact inventory reporting requirements'
        },
        recommendations: [{
          action: 'Review inventory data configuration',
          priority: 'immediate',
          implementation: 'Ensure inventory transactions are properly categorized',
          expectedOutcome: 'Restore inventory monitoring capabilities'
        }],
        data: {
          metrics: []
        }
      });
    }

    return insights;
  }

  private async analyzeInventoryTurnover(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Get inventory-related accounts
    const inventoryAccounts = await this.getAccountsByType(ctx, 'asset');
    const inventoryAccountIds = inventoryAccounts
      .filter(acc => acc.name.toLowerCase().includes('inventory'))
      .map(acc => acc._id);

    if (inventoryAccountIds.length === 0) {
      return {
        type: 'retail_inventory_setup',
        title: 'Inventory Accounts Configuration',
        description: 'No inventory accounts found for turnover analysis',
        severity: 'medium',
        confidence: 100,
        impact: {
          financial: 0,
          operational: 'Cannot perform inventory turnover analysis',
          compliance: 'Inventory tracking may be required for retail operations'
        },
        recommendations: [{
          action: 'Configure inventory accounts in chart of accounts',
          priority: 'short_term',
          implementation: 'Set up proper inventory asset accounts and categorization',
          expectedOutcome: 'Enable comprehensive inventory analysis'
        }],
        data: {
          metrics: [
            { name: 'Inventory Accounts Found', value: 0, trend: 'flat' }
          ]
        }
      };
    }

    // Mock inventory turnover calculation
    const averageInventoryValue = 50000; // Mock value
    const cogs = 120000; // Mock COGS
    const turnoverRatio = cogs / averageInventoryValue;
    const daysInInventory = 365 / turnoverRatio;

    const benchmark = 6; // Industry benchmark
    const performance = turnoverRatio >= benchmark ? 'good' : 'poor';

    return {
      type: 'retail_inventory_turnover',
      title: 'Inventory Turnover Analysis',
      description: `Inventory turns ${turnoverRatio.toFixed(1)} times per year (${daysInInventory.toFixed(0)} days on hand)`,
      severity: performance === 'poor' ? 'medium' : 'low',
      confidence: 75,
      impact: {
        financial: performance === 'poor' ? averageInventoryValue * 0.1 : 0,
        operational: `Inventory ${performance === 'good' ? 'efficiently managed' : 'may be excessive'}`,
        compliance: 'Within retail inventory management standards'
      },
      recommendations: [
        {
          action: performance === 'poor' ? 'Reduce inventory levels' : 'Maintain current inventory management',
          priority: performance === 'poor' ? 'short_term' : 'long_term',
          implementation: 'Review slow-moving items and optimize purchase timing',
          expectedOutcome: 'Improve cash flow and reduce carrying costs'
        }
      ],
      data: {
        metrics: [
          { name: 'Turnover Ratio', value: turnoverRatio.toFixed(1), trend: 'flat' },
          { name: 'Days in Inventory', value: Math.round(daysInInventory), trend: 'flat' },
          { name: 'Average Inventory Value', value: this.formatCurrency(averageInventoryValue), trend: 'flat' },
          { name: 'Industry Benchmark', value: benchmark, trend: 'flat' }
        ]
      }
    };
  }

  private async identifySlowMovingInventory(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Placeholder implementation for slow-moving inventory identification
    return {
      type: 'retail_slow_moving',
      title: 'Slow-Moving Inventory Alert',
      description: 'Items with low turnover rates require attention',
      severity: 'medium',
      confidence: 70,
      impact: {
        financial: 15000, // Estimated carrying cost
        operational: 'Storage space and cash flow impact',
        compliance: 'May require write-downs for aged inventory'
      },
      recommendations: [{
        action: 'Review and liquidate slow-moving items',
        priority: 'short_term',
        implementation: 'Implement promotional pricing or clearance sales',
        expectedOutcome: 'Free up working capital and storage space'
      }],
      data: {
        metrics: [
          { name: 'Slow-Moving Items', value: 'Analysis in development', trend: 'flat' }
        ]
      }
    };
  }

  private async analyzeStockLevels(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Placeholder for stock level analysis
    return {
      type: 'retail_stock_levels',
      title: 'Stock Level Optimization',
      description: 'Analysis of stockout and overstock situations',
      severity: 'low',
      confidence: 65,
      impact: {
        financial: 0,
        operational: 'Stock level monitoring in development',
        compliance: 'Standard retail inventory management'
      },
      recommendations: [{
        action: 'Implement automated reorder points',
        priority: 'long_term',
        implementation: 'Set up min/max inventory levels by item',
        expectedOutcome: 'Reduce stockouts and excess inventory'
      }],
      data: {
        metrics: []
      }
    };
  }

  private async analyzeSeasonalTrends(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Placeholder for seasonal trend analysis
    return {
      type: 'retail_seasonal_trends',
      title: 'Seasonal Inventory Trends',
      description: 'Historical patterns for seasonal inventory planning',
      severity: 'low',
      confidence: 60,
      impact: {
        financial: 0,
        operational: 'Seasonal planning optimization opportunity',
        compliance: 'Standard retail forecasting practice'
      },
      recommendations: [{
        action: 'Develop seasonal inventory models',
        priority: 'long_term',
        implementation: 'Analyze historical sales patterns by season',
        expectedOutcome: 'Improve seasonal inventory positioning'
      }],
      data: {
        metrics: []
      }
    };
  }
}

/**
 * Family Office Consolidator Agent
 * Consolidates financial data across multiple entities and investments
 */
export class FamilyOfficeConsolidator extends BaseAgentClass {
  constructor(organizationId: string, config: BaseAgent['config']) {
    super(organizationId, 'family_office', config);
  }

  async analyze(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight[]> {
    const insights: AgentInsight[] = [];

    try {
      // Consolidate across entities
      const entityConsolidation = await this.consolidateEntities(ctx, dateRange);
      if (entityConsolidation) insights.push(entityConsolidation);

      // Investment performance analysis
      const investmentPerformance = await this.analyzeInvestmentPerformance(ctx, dateRange);
      if (investmentPerformance) insights.push(investmentPerformance);

      // Risk concentration analysis
      const riskAnalysis = await this.analyzeRiskConcentration(ctx, dateRange);
      if (riskAnalysis) insights.push(riskAnalysis);

      // Cash flow consolidation
      const cashFlowAnalysis = await this.consolidateCashFlow(ctx, dateRange);
      if (cashFlowAnalysis) insights.push(cashFlowAnalysis);

      // Tax efficiency analysis
      const taxEfficiency = await this.analyzeTaxEfficiency(ctx, dateRange);
      if (taxEfficiency) insights.push(taxEfficiency);

    } catch (error) {
      console.error('Family office consolidation failed:', error);
      insights.push({
        type: 'analysis_error',
        title: 'Family Office Consolidation Error',
        description: `Failed to complete consolidation analysis: ${error}`,
        severity: 'high',
        confidence: 100,
        impact: {
          financial: 0,
          operational: 'Multi-entity consolidation is unavailable',
          compliance: 'May impact family office reporting requirements'
        },
        recommendations: [{
          action: 'Review entity structure and data mapping',
          priority: 'immediate',
          implementation: 'Ensure all entities are properly configured and connected',
          expectedOutcome: 'Restore consolidated reporting capabilities'
        }],
        data: {
          metrics: []
        }
      });
    }

    return insights;
  }

  private async consolidateEntities(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Get all related organizations/entities
    const allTransactions = await ctx.db
      .query("transactions")
      .filter((q: any) => 
        q.and(
          q.eq(q.field("organizationId"), this.organizationId),
          q.gte(q.field("transactionDate"), dateRange.start),
          q.lte(q.field("transactionDate"), dateRange.end)
        )
      )
      .collect();

    // Group by entity/department (using departmentId as entity identifier)
    const entityGroups: Record<string, any[]> = {};
    allTransactions.forEach(txn => {
      const entityId = txn.departmentId || 'main_entity';
      if (!entityGroups[entityId]) {
        entityGroups[entityId] = [];
      }
      entityGroups[entityId].push(txn);
    });

    const entityCount = Object.keys(entityGroups).length;
    const totalAssets = Object.values(entityGroups).reduce((total, txns) => {
      return total + txns
        .filter(t => t.type === 'deposit' || t.type === 'transfer')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }, 0);

    const consolidatedRevenue = Object.values(entityGroups).reduce((total, txns) => {
      return total + txns
        .filter(t => t.type === 'invoice')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }, 0);

    return {
      type: 'family_office_consolidation',
      title: 'Multi-Entity Consolidation',
      description: `Consolidated view across ${entityCount} entities shows total assets of ${this.formatCurrency(totalAssets)}`,
      severity: 'low',
      confidence: 80,
      impact: {
        financial: totalAssets,
        operational: `Managing ${entityCount} entities with consolidated oversight`,
        compliance: 'Consolidated reporting available for family office requirements'
      },
      recommendations: [
        {
          action: entityCount > 5 ? 'Consider entity structure optimization' : 'Maintain current structure',
          priority: 'long_term',
          implementation: 'Review entity efficiency and consolidation opportunities',
          expectedOutcome: 'Optimize family office structure and reporting'
        }
      ],
      data: {
        metrics: [
          { name: 'Entities Consolidated', value: entityCount, trend: 'flat' },
          { name: 'Total Assets', value: this.formatCurrency(totalAssets), trend: 'up' },
          { name: 'Consolidated Revenue', value: this.formatCurrency(consolidatedRevenue), trend: 'up' },
          { name: 'Average Entity Size', value: this.formatCurrency(totalAssets / entityCount), trend: 'flat' }
        ],
        charts: [{
          type: 'pie',
          data: Object.entries(entityGroups).map(([entityId, txns]) => ({
            entity: entityId,
            value: txns.reduce((sum, t) => sum + (t.amount || 0), 0)
          }))
        }]
      }
    };
  }

  private async analyzeInvestmentPerformance(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Investment performance analysis placeholder
    return {
      type: 'family_office_investments',
      title: 'Investment Portfolio Performance',
      description: 'Analysis of investment returns across family office portfolio',
      severity: 'low',
      confidence: 70,
      impact: {
        financial: 0,
        operational: 'Investment tracking in development',
        compliance: 'Standard family office investment reporting'
      },
      recommendations: [{
        action: 'Implement investment performance tracking',
        priority: 'short_term',
        implementation: 'Connect investment accounts and benchmark tracking',
        expectedOutcome: 'Comprehensive investment performance monitoring'
      }],
      data: {
        metrics: [
          { name: 'Investment Analysis', value: 'In Development', trend: 'flat' }
        ]
      }
    };
  }

  private async analyzeRiskConcentration(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Risk concentration analysis placeholder
    return {
      type: 'family_office_risk',
      title: 'Risk Concentration Analysis',
      description: 'Assessment of concentration risk across portfolio',
      severity: 'medium',
      confidence: 65,
      impact: {
        financial: 0,
        operational: 'Risk monitoring framework needed',
        compliance: 'Family office risk management requirements'
      },
      recommendations: [{
        action: 'Develop risk concentration monitoring',
        priority: 'short_term',
        implementation: 'Implement diversification metrics and alerts',
        expectedOutcome: 'Enhanced portfolio risk management'
      }],
      data: {
        metrics: []
      }
    };
  }

  private async consolidateCashFlow(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Cash flow consolidation placeholder
    return {
      type: 'family_office_cashflow',
      title: 'Consolidated Cash Flow',
      description: 'Multi-entity cash flow analysis and projections',
      severity: 'low',
      confidence: 75,
      impact: {
        financial: 0,
        operational: 'Consolidated cash flow visibility',
        compliance: 'Family office liquidity reporting'
      },
      recommendations: [{
        action: 'Enhance cash flow forecasting',
        priority: 'short_term',
        implementation: 'Implement multi-entity cash flow projections',
        expectedOutcome: 'Improved liquidity management across entities'
      }],
      data: {
        metrics: []
      }
    };
  }

  private async analyzeTaxEfficiency(ctx: any, dateRange: { start: number; end: number }): Promise<AgentInsight | null> {
    // Tax efficiency analysis placeholder
    return {
      type: 'family_office_tax',
      title: 'Tax Efficiency Analysis',
      description: 'Cross-entity tax optimization opportunities',
      severity: 'medium',
      confidence: 60,
      impact: {
        financial: 0,
        operational: 'Tax optimization opportunity',
        compliance: 'Family office tax planning requirements'
      },
      recommendations: [{
        action: 'Implement tax optimization monitoring',
        priority: 'long_term',
        implementation: 'Develop cross-entity tax efficiency metrics',
        expectedOutcome: 'Optimize family office tax position'
      }],
      data: {
        metrics: []
      }
    };
  }
}

/**
 * Convex Actions for Vertical Agent Management
 */

/**
 * Get vertical-specific insights
 */
export const getVerticalInsights = action({
  args: {
    organizationId: v.id("organizations"),
    vertical: v.union(
      v.literal("franchise"),
      v.literal("retail"),
      v.literal("family_office")
    ),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    config: v.optional(v.object({
      analysisDepth: v.union(v.literal("basic"), v.literal("detailed"), v.literal("comprehensive")),
      alertThresholds: v.object({
        high: v.number(),
        medium: v.number(),
        low: v.number(),
      }),
      reportingFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    })),
  },
  handler: async (ctx, args) => {
    const defaultConfig = {
      analysisDepth: 'detailed' as const,
      alertThresholds: { high: 80, medium: 60, low: 40 },
      reportingFrequency: 'weekly' as const,
    };

    const config = args.config || defaultConfig;

    let agent: BaseAgentClass;

    // Create appropriate agent based on vertical
    switch (args.vertical) {
      case 'franchise':
        agent = new FranchiseVarianceAgent(args.organizationId, config);
        break;
      case 'retail':
        agent = new RetailInventoryAgent(args.organizationId, config);
        break;
      case 'family_office':
        agent = new FamilyOfficeConsolidator(args.organizationId, config);
        break;
      default:
        throw new Error(`Unsupported vertical: ${args.vertical}`);
    }

    // Run analysis
    const insights = await agent.analyze(ctx, args.dateRange);

    console.log(`Generated ${insights.length} insights for ${args.vertical} vertical`);

    return {
      vertical: args.vertical,
      organizationId: args.organizationId,
      analysisDate: Date.now(),
      insightCount: insights.length,
      insights,
    };
  },
});

/**
 * Get available vertical agents for organization
 */
export const getAvailableVerticalAgents = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get organization to determine available agents
    const organization = await ctx.db.get(args.organizationId);
    
    if (!organization) {
      throw new Error("Organization not found");
    }

    const availableAgents = [
      {
        type: 'franchise',
        name: 'Franchise Variance Agent',
        description: 'Analyzes performance variance across franchise locations',
        capabilities: [
          'Revenue variance analysis',
          'Expense efficiency tracking',
          'Underperformer identification',
          'Same-store sales growth'
        ],
        isAvailable: organization.vertical === 'franchise' || !organization.vertical,
      },
      {
        type: 'retail',
        name: 'Retail Inventory Agent',
        description: 'Optimizes inventory levels and identifies trends',
        capabilities: [
          'Inventory turnover analysis',
          'Slow-moving inventory alerts',
          'Stock level optimization',
          'Seasonal trend analysis'
        ],
        isAvailable: organization.vertical === 'retail' || !organization.vertical,
      },
      {
        type: 'family_office',
        name: 'Family Office Consolidator',
        description: 'Consolidates multi-entity financial data and analysis',
        capabilities: [
          'Multi-entity consolidation',
          'Investment performance tracking',
          'Risk concentration analysis',
          'Tax efficiency optimization'
        ],
        isAvailable: organization.vertical === 'family_office' || !organization.vertical,
      }
    ];

    return {
      organizationId: args.organizationId,
      vertical: organization.vertical,
      availableAgents: availableAgents.filter(agent => agent.isAvailable),
    };
  },
});