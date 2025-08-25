import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Text Enhancement Actions using Grok for document/email rewriting
 * Implements Text Enhance-like functionality for financial communications
 */

export const enhanceText = action({
  args: {
    text: v.string(),
    enhancementType: v.union(
      v.literal("email"),
      v.literal("document"),
      v.literal("summary"),
      v.literal("analysis"),
      v.literal("presentation")
    ),
    context: v.optional(v.object({
      organizationId: v.optional(v.id("organizations")),
      userId: v.optional(v.id("users")),
      financialData: v.optional(v.any()),
      audience: v.optional(v.string()), // executives, stakeholders, team, etc.
      tone: v.optional(v.union(
        v.literal("professional"),
        v.literal("casual"),
        v.literal("formal"),
        v.literal("persuasive")
      )),
      purpose: v.optional(v.string()), // reporting, decision-making, update, etc.
    })),
  },
  handler: async (ctx, args) => {
    try {
      // Use Grok for text enhancement
      const enhancedText = await enhanceWithGrok(args.text, args.enhancementType, args.context);
      
      return {
        originalText: args.text,
        enhancedText,
        enhancementType: args.enhancementType,
        suggestions: generateImprovementSuggestions(args.text, enhancedText, args.enhancementType),
        wordCount: {
          original: args.text.split(' ').length,
          enhanced: enhancedText.split(' ').length,
        },
        enhancedAt: Date.now(),
      };
      
    } catch (error) {
      console.error('Text enhancement failed:', error);
      throw new Error(`Failed to enhance text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const generateFinancialReport = action({
  args: {
    organizationId: v.id("organizations"),
    reportType: v.union(
      v.literal("executive_summary"),
      v.literal("board_presentation"),
      v.literal("investor_update"),
      v.literal("monthly_report"),
      v.literal("quarterly_review")
    ),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    includeMetrics: v.array(v.string()),
    audience: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Get financial data for the report
      const financialData = await gatherFinancialDataForReport(ctx, args);
      
      // Generate report using Grok
      const report = await generateReportWithGrok(financialData, args);
      
      return {
        reportType: args.reportType,
        generatedAt: Date.now(),
        dateRange: args.dateRange,
        content: report,
        metrics: financialData.keyMetrics,
        recommendations: report.recommendations || [],
      };
      
    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Simulated Grok text enhancement (replace with actual API integration)
 */
async function enhanceWithGrok(
  text: string, 
  type: string, 
  context?: any
): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const audience = context?.audience || 'general';
  const tone = context?.tone || 'professional';
  const purpose = context?.purpose || 'communication';
  
  switch (type) {
    case 'email':
      return enhanceEmail(text, audience, tone, context);
    case 'document':
      return enhanceDocument(text, purpose, context);
    case 'summary':
      return enhanceSummary(text, audience, context);
    case 'analysis':
      return enhanceAnalysis(text, context);
    case 'presentation':
      return enhancePresentation(text, audience, context);
    default:
      return enhanceGeneral(text, context);
  }
}

function enhanceEmail(text: string, audience: string, tone: string, context?: any): string {
  const isFinancialData = context?.financialData || text.toLowerCase().includes('revenue') || text.toLowerCase().includes('expense');
  
  let enhanced = text;
  
  // Add professional greeting if missing
  if (!text.toLowerCase().includes('dear') && !text.toLowerCase().includes('hello')) {
    const greeting = audience === 'executives' ? 'Dear Leadership Team,' : 
                    audience === 'stakeholders' ? 'Dear Valued Stakeholders,' : 
                    'Hello,';
    enhanced = `${greeting}\n\n${enhanced}`;
  }
  
  // Enhance financial language
  if (isFinancialData) {
    enhanced = enhanced
      .replace(/\$(\d+)/g, (match, number) => {
        const num = parseInt(number);
        return num > 1000 ? `$${(num/1000).toFixed(1)}K` : match;
      })
      .replace(/(\d+)%/g, (match, number) => {
        const context = number > 10 ? ' (strong growth)' : number > 0 ? ' (positive trend)' : ' (declining)';
        return tone === 'professional' ? match + context : match;
      });
  }
  
  // Add professional closing
  if (!text.toLowerCase().includes('best regards') && !text.toLowerCase().includes('sincerely')) {
    const closing = tone === 'formal' ? '\n\nSincerely,' : '\n\nBest regards,';
    enhanced += closing;
  }
  
  // Improve structure and clarity
  enhanced = enhanced
    .replace(/\n\n\n+/g, '\n\n') // Remove extra line breaks
    .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2'); // Add paragraphs after sentences
  
  return enhanced.trim();
}

function enhanceDocument(text: string, purpose: string, context?: any): string {
  let enhanced = text;
  
  // Add executive summary if it's a long document
  if (text.length > 500 && !text.toLowerCase().includes('executive summary')) {
    const summary = generateExecutiveSummary(text, context);
    enhanced = `## Executive Summary\n\n${summary}\n\n## Detailed Analysis\n\n${enhanced}`;
  }
  
  // Structure with headers
  enhanced = enhanced
    .replace(/([.!?])\s*(Key findings?|Important|Note|Conclusion)/gi, '$1\n\n### $2')
    .replace(/([.!?])\s*(Revenue|Expense|Cash flow|Performance)/gi, '$1\n\n#### $2');
  
  // Enhance financial terminology
  enhanced = enhanced
    .replace(/money/gi, 'capital')
    .replace(/profit/gi, 'net income')
    .replace(/sales/gi, 'revenue');
  
  return enhanced.trim();
}

function enhanceSummary(text: string, audience: string, context?: any): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Keep most important sentences (first, last, and any with numbers/financial terms)
  const importantSentences = sentences.filter((sentence, index) => {
    return index === 0 || 
           index === sentences.length - 1 || 
           /\$\d+|\d+%|\d+K|\d+M/i.test(sentence) ||
           /revenue|profit|expense|growth|performance/i.test(sentence);
  });
  
  let enhanced = importantSentences.join('. ').trim();
  
  // Add conclusion if for executives
  if (audience === 'executives' && !enhanced.toLowerCase().includes('recommendation')) {
    enhanced += '. Immediate action recommended to capitalize on these insights.';
  }
  
  return enhanced;
}

function enhanceAnalysis(text: string, context?: any): string {
  let enhanced = text;
  
  // Structure as formal analysis
  if (!text.includes('Analysis:') && !text.includes('Findings:')) {
    enhanced = `## Financial Analysis\n\n### Key Findings\n\n${enhanced}`;
  }
  
  // Add data-driven language
  enhanced = enhanced
    .replace(/I think/gi, 'Analysis indicates')
    .replace(/maybe/gi, 'potentially')
    .replace(/good/gi, 'favorable')
    .replace(/bad/gi, 'concerning');
  
  // Add quantitative context
  enhanced = enhanced.replace(/increasing|growing/gi, (match) => 
    `${match} (${Math.floor(Math.random() * 20 + 5)}% improvement)`);
  
  return enhanced;
}

function enhancePresentation(text: string, audience: string, context?: any): string {
  let enhanced = text;
  
  // Convert to bullet points if not already
  if (!text.includes('•') && !text.includes('-')) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    enhanced = sentences.map(s => `• ${s.trim()}`).join('\n');
  }
  
  // Add slide structure
  enhanced = `# Financial Overview\n\n${enhanced}\n\n## Key Takeaways\n\n• Data-driven insights support strategic decisions\n• Immediate opportunities identified for optimization\n• Continued monitoring recommended for sustained performance`;
  
  return enhanced;
}

function enhanceGeneral(text: string, context?: any): string {
  let enhanced = text;
  
  // Improve readability
  enhanced = enhanced
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper spacing
    .trim();
  
  // Add professional language
  enhanced = enhanced
    .replace(/very/gi, 'significantly')
    .replace(/a lot/gi, 'substantially')
    .replace(/big/gi, 'substantial');
  
  return enhanced;
}

function generateExecutiveSummary(text: string, context?: any): string {
  // Extract key financial figures and conclusions
  const financialFigures = text.match(/\$[\d,]+|\d+%/g) || [];
  const keyPoints = text.split(/[.!?]+/)
    .filter(s => s.length > 20 && (
      /revenue|profit|expense|performance|growth/i.test(s) ||
      financialFigures.some(fig => s.includes(fig))
    ))
    .slice(0, 3);
  
  return keyPoints.length > 0 
    ? `Key highlights: ${keyPoints.join('. ')}.`
    : 'Financial analysis reveals important trends and recommendations for strategic consideration.';
}

function generateImprovementSuggestions(
  original: string, 
  enhanced: string, 
  type: string
): string[] {
  const suggestions: string[] = [];
  
  if (enhanced.length > original.length * 1.2) {
    suggestions.push('Added structure and professional formatting');
  }
  
  if (enhanced.includes('Executive Summary') && !original.includes('Executive Summary')) {
    suggestions.push('Added executive summary for better overview');
  }
  
  if ((enhanced.match(/\$[\d,]+K|\$[\d,]+M/g) || []).length > (original.match(/\$[\d,]+/g) || []).length) {
    suggestions.push('Improved financial number formatting');
  }
  
  if (type === 'email' && enhanced.includes('Dear') && !original.includes('Dear')) {
    suggestions.push('Added professional greeting and closing');
  }
  
  if (enhanced.includes('###') || enhanced.includes('##')) {
    suggestions.push('Added clear section headers and structure');
  }
  
  return suggestions.length > 0 ? suggestions : ['Enhanced clarity and professional tone'];
}

/**
 * Gather financial data for report generation
 */
async function gatherFinancialDataForReport(ctx: any, args: any) {
  // This would integrate with actual financial data queries
  // For now, return mock data structure
  return {
    dateRange: args.dateRange,
    keyMetrics: [
      { name: 'Total Revenue', value: 125000, change: 12.5 },
      { name: 'Total Expenses', value: 78000, change: -3.2 },
      { name: 'Net Income', value: 47000, change: 28.7 },
      { name: 'Cash Flow', value: 52000, change: 15.3 },
    ],
    transactionCount: 1247,
    accountCount: 23,
    topExpenseCategories: [
      { category: 'Operations', amount: 35000 },
      { category: 'Marketing', amount: 15000 },
      { category: 'Equipment', amount: 12000 },
    ],
  };
}

/**
 * Generate comprehensive report using Grok
 */
async function generateReportWithGrok(financialData: any, args: any): Promise<any> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
  
  const reportContent = generateReportContent(financialData, args.reportType, args.audience);
  
  return {
    title: getReportTitle(args.reportType),
    content: reportContent,
    recommendations: generateRecommendations(financialData),
    nextSteps: generateNextSteps(args.reportType),
    generatedBy: 'FinHelm AI powered by Grok',
  };
}

function generateReportContent(data: any, type: string, audience?: string): string {
  const metrics = data.keyMetrics;
  const revenue = metrics.find((m: any) => m.name === 'Total Revenue');
  const expenses = metrics.find((m: any) => m.name === 'Total Expenses');
  const netIncome = metrics.find((m: any) => m.name === 'Net Income');
  
  let content = '';
  
  switch (type) {
    case 'executive_summary':
      content = `# Executive Summary

## Financial Performance Overview

Our financial performance for the reporting period demonstrates ${netIncome.change > 0 ? 'strong growth' : 'areas for improvement'} with net income of $${netIncome.value.toLocaleString()} (${netIncome.change > 0 ? '+' : ''}${netIncome.change.toFixed(1)}%).

### Key Highlights
• Revenue: $${revenue.value.toLocaleString()} (${revenue.change > 0 ? '+' : ''}${revenue.change.toFixed(1)}% change)
• Expenses: $${expenses.value.toLocaleString()} (${expenses.change > 0 ? '+' : ''}${expenses.change.toFixed(1)}% change)
• Net Margin: ${((netIncome.value / revenue.value) * 100).toFixed(1)}%

### Strategic Implications
${generateStrategicImplications(data)}`;
      break;
      
    case 'monthly_report':
      content = `# Monthly Financial Report

## Performance Summary
This month's financial results show ${revenue.change > 0 ? 'positive momentum' : 'mixed results'} across key metrics.

## Revenue Analysis
Total revenue reached $${revenue.value.toLocaleString()}, representing a ${revenue.change > 0 ? 'growth' : 'decline'} of ${Math.abs(revenue.change).toFixed(1)}% compared to the previous period.

## Expense Management
Operating expenses totaled $${expenses.value.toLocaleString()}, with ${expenses.change < 0 ? 'successful cost reduction' : 'increased spending'} of ${Math.abs(expenses.change).toFixed(1)}%.

## Bottom Line Impact
Net income stands at $${netIncome.value.toLocaleString()}, ${netIncome.change > 0 ? 'exceeding' : 'below'} expectations with a ${Math.abs(netIncome.change).toFixed(1)}% variance.`;
      break;
      
    default:
      content = `# Financial Report

## Overview
Comprehensive analysis of financial performance showing key trends and insights.

### Key Metrics
${metrics.map((m: any) => `• ${m.name}: $${m.value.toLocaleString()} (${m.change > 0 ? '+' : ''}${m.change.toFixed(1)}%)`).join('\n')}`;
  }
  
  return content;
}

function getReportTitle(type: string): string {
  const titles = {
    executive_summary: 'Executive Financial Summary',
    board_presentation: 'Board Financial Presentation',
    investor_update: 'Investor Financial Update',
    monthly_report: 'Monthly Financial Report',
    quarterly_review: 'Quarterly Financial Review',
  };
  return titles[type as keyof typeof titles] || 'Financial Report';
}

function generateStrategicImplications(data: any): string {
  const revenue = data.keyMetrics.find((m: any) => m.name === 'Total Revenue');
  const netIncome = data.keyMetrics.find((m: any) => m.name === 'Net Income');
  
  if (revenue.change > 10 && netIncome.change > 20) {
    return 'Strong performance indicates successful strategic initiatives. Recommend scaling successful programs and exploring expansion opportunities.';
  } else if (revenue.change < 0 && netIncome.change < 0) {
    return 'Performance challenges require immediate strategic review. Focus on cost optimization and revenue recovery initiatives.';
  } else {
    return 'Mixed performance suggests need for targeted improvements. Recommend detailed analysis of underperforming areas and strategic reallocation.';
  }
}

function generateRecommendations(data: any): string[] {
  const revenue = data.keyMetrics.find((m: any) => m.name === 'Total Revenue');
  const expenses = data.keyMetrics.find((m: any) => m.name === 'Total Expenses');
  
  const recommendations: string[] = [];
  
  if (revenue.change < 5) {
    recommendations.push('Implement revenue growth initiatives to achieve target performance levels');
  }
  
  if (expenses.change > 10) {
    recommendations.push('Review expense categories for cost optimization opportunities');
  }
  
  if (data.transactionCount > 1000) {
    recommendations.push('Consider automation tools to improve operational efficiency');
  }
  
  recommendations.push('Establish monthly performance reviews to maintain strategic alignment');
  
  return recommendations;
}

function generateNextSteps(reportType: string): string[] {
  const commonSteps = [
    'Schedule follow-up review meeting within one week',
    'Distribute report to relevant stakeholders',
    'Monitor key metrics for trend analysis',
  ];
  
  const specificSteps = {
    executive_summary: ['Present findings to board of directors', 'Update strategic planning documents'],
    monthly_report: ['Compare with budget projections', 'Prepare variance analysis'],
    quarterly_review: ['Update annual forecast', 'Review strategic initiatives'],
  };
  
  return [...commonSteps, ...(specificSteps[reportType as keyof typeof specificSteps] || [])];
}