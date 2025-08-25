/**
 * Grok API Integration Service for FinHelm.ai
 * Provides real-time preview functionality for custom agents
 */

import { AIModel } from '../types/agent';

export interface GrokPreviewRequest {
  prompt: string;
  query: string;
  model: AIModel;
  temperature: number;
  maxTokens: number;
  organizationId?: string;
  userId?: string;
}

export interface GrokPreviewResponse {
  response: string;
  executionTime: number;
  tokensUsed: number;
  cost?: number;
  model: string;
  success: boolean;
  error?: string;
}

export interface GrokConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

class GrokService {
  private config: GrokConfig;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: GrokConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GROK_API_KEY,
      baseUrl: config.baseUrl || 'https://api.x.ai/v1',
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Preview agent response with debouncing to avoid excessive API calls
   */
  async previewAgentResponse(
    request: GrokPreviewRequest,
    debounceMs: number = 1000
  ): Promise<GrokPreviewResponse> {
    const debounceKey = `${request.organizationId}-${request.userId}`;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(debounceKey);
        
        try {
          const response = await this.callGrokAPI(request);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }, debounceMs);

      this.debounceTimers.set(debounceKey, timer);
    });
  }

  /**
   * Make direct call to Grok API without debouncing
   */
  async callGrokAPI(request: GrokPreviewRequest): Promise<GrokPreviewResponse> {
    const startTime = Date.now();

    try {
      // Check if we're in development/preview mode - use mock responses
      if (!this.config.apiKey || process.env.NODE_ENV === 'development') {
        return this.getMockGrokResponse(request, startTime);
      }

      // Prepare the system prompt and user message
      const systemPrompt = this.buildSystemPrompt(request.prompt);
      const userMessage = request.query;

      // Make API call to Grok
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.mapModelName(request.model),
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      // Extract response and usage information
      const grokResponse = data.choices?.[0]?.message?.content || 'No response generated';
      const tokensUsed = data.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, request.model);

      return {
        response: grokResponse,
        executionTime,
        tokensUsed,
        cost,
        model: request.model,
        success: true,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'TimeoutError') {
        return {
          response: '',
          executionTime,
          tokensUsed: 0,
          model: request.model,
          success: false,
          error: 'Request timed out. The AI model took too long to respond.',
        };
      }

      // Handle network and API errors
      return {
        response: '',
        executionTime,
        tokensUsed: 0,
        model: request.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Build a comprehensive system prompt for the agent
   */
  private buildSystemPrompt(customPrompt: string): string {
    const basePrompt = `You are an AI financial assistant integrated with FinHelm.ai, a comprehensive ERP co-pilot system.

Context:
- You have access to financial data from ERP systems (QuickBooks, Sage Intacct, NetSuite, Xero)
- Your responses should be professional, accurate, and actionable
- Focus on providing insights that help with financial decision-making
- Always consider compliance and audit requirements in your recommendations

Custom Instructions:
${customPrompt}

Response Guidelines:
- Provide specific, actionable insights
- Use financial terminology appropriately
- Include relevant data points when possible
- Suggest next steps or recommendations
- Format responses clearly with headers and bullet points when appropriate`;

    return basePrompt;
  }

  /**
   * Map internal model names to Grok API model names
   */
  private mapModelName(model: AIModel): string {
    const modelMap: Record<AIModel, string> = {
      'grok-beta': 'grok-beta',
      'gpt-4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'claude-3-opus': 'claude-3-opus',
      'claude-3-sonnet': 'claude-3-sonnet',
      'claude-3-haiku': 'claude-3-haiku',
    };

    return modelMap[model] || 'grok-beta';
  }

  /**
   * Calculate estimated cost based on token usage and model
   */
  private calculateCost(tokensUsed: number, model: AIModel): number {
    // Pricing per 1000 tokens (estimated)
    const pricingMap: Record<AIModel, number> = {
      'grok-beta': 0.002,
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'claude-3-haiku': 0.00025,
    };

    const pricePerToken = (pricingMap[model] || 0.002) / 1000;
    return tokensUsed * pricePerToken;
  }

  /**
   * Generate mock response for development/testing
   */
  private async getMockGrokResponse(
    request: GrokPreviewRequest, 
    startTime: number
  ): Promise<GrokPreviewResponse> {
    // Simulate network delay
    const delay = 1000 + Math.random() * 2000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    const mockResponses = this.generateMockResponse(request.query, request.model);
    const executionTime = Date.now() - startTime;
    const estimatedTokens = Math.ceil(mockResponses.length / 4);

    return {
      response: mockResponses,
      executionTime,
      tokensUsed: estimatedTokens,
      cost: this.calculateCost(estimatedTokens, request.model),
      model: request.model,
      success: true,
    };
  }

  /**
   * Generate contextual mock responses based on query type
   */
  private generateMockResponse(query: string, model: AIModel): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('rewrite') && queryLower.includes('email')) {
      return `**Professional Email Rewrite**

Subject: Monthly Expense Report - November 2024

Dear Management Team,

I hope this message finds you well. Please find attached our comprehensive expense report for November 2024.

**Executive Summary:**
• Total Expenses: $45,230
• Budget Variance: -3.2% (under budget)
• Key Categories: Travel (42%), Software (28%), Operations (30%)

**Notable Items:**
- Conference attendance generated valuable networking opportunities
- New software licenses aligned with digital transformation goals  
- Operational efficiency improvements reduced overhead by 8%

The detailed breakdown includes all supporting documentation and has been reviewed for accuracy and compliance with company policies.

Please let me know if you need any additional information or have questions about specific line items.

Best regards,
Finance Team

*Powered by ${model} | FinHelm.ai Custom Agent*`;
    }

    if (queryLower.includes('categorize') && queryLower.includes('transaction')) {
      return `**Transaction Categorization Analysis**

**Transaction Details:**
- Amount: $2,500.00
- Vendor: ABC Software Solutions
- Date: Current Period

**Recommended Categorization:**
✅ **Primary Category:** Software & Technology
✅ **Sub-Category:** Business Software Licenses  
✅ **Confidence Level:** 96%

**Analysis Factors:**
• Vendor name pattern matches software providers
• Amount consistent with annual software licensing
• Historical data shows similar transactions from this vendor
• Industry classification aligns with technology services

**Chart of Accounts:**
- **Account Code:** 6200 - Technology Expenses
- **Department:** IT Operations
- **Tax Treatment:** Deductible business expense

**Recommendations:**
1. Set up recurring categorization rule for this vendor
2. Review software inventory for license optimization
3. Consider multi-year agreements for cost savings

*Powered by ${model} | FinHelm.ai Custom Agent*`;
    }

    if (queryLower.includes('variance') || queryLower.includes('analysis')) {
      return `**Financial Variance Analysis**

**Period:** Current Month vs Budget

**Key Findings:**
📈 **Revenue Performance:** +8.3% above forecast
📊 **Expense Control:** -2.1% under budget  
💰 **Net Impact:** $12,450 favorable variance

**Revenue Analysis:**
• Client payments accelerated due to improved invoicing process
• New customer acquisition exceeded projections by 15%
• Recurring revenue streams showing strong stability

**Expense Highlights:**
• Marketing spend optimization saved $3,200
• Energy costs reduced through efficiency initiatives  
• Travel expenses normalized after Q2 spike

**Action Items:**
1. **Investigate:** Unusual increase in office supplies (+45%)
2. **Optimize:** Review vendor contracts expiring this quarter
3. **Monitor:** Customer concentration risk in top 3 accounts

**Forecast Impact:**
Based on current trends, we project continued favorable variances for the remainder of the fiscal year.

*Powered by ${model} | FinHelm.ai Custom Agent*`;
    }

    // Default response for general queries
    return `**Financial Intelligence Response**

**Query Analysis:** "${query}"

Based on your custom agent configuration and financial data context, here's my analysis:

**Key Insights:**
• **Data Integration:** Leveraging real-time ERP data for accurate analysis
• **Pattern Recognition:** Identifying trends across multiple financial dimensions  
• **Risk Assessment:** Evaluating potential compliance and operational risks
• **Actionable Recommendations:** Providing specific next steps for optimization

**Financial Context:**
Your organization's financial data shows healthy performance metrics with opportunities for optimization in several key areas. The integrated approach allows for comprehensive analysis across accounts payable, receivable, and general ledger functions.

**Recommendations:**
1. **Process Automation:** Implement workflow rules for similar scenarios
2. **Data Quality:** Ensure consistent categorization and coding standards
3. **Performance Monitoring:** Set up alerts for unusual patterns or variances
4. **Compliance Review:** Regular audit trails and documentation updates

**Next Steps:**
This analysis can be expanded with specific parameters, date ranges, or account filters to provide more targeted insights for your business needs.

*Powered by ${model} | FinHelm.ai Custom Agent*

*Note: This is a preview response. Production agents will access your actual financial data for more precise analysis.*`;
  }

  /**
   * Check API health and rate limits
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; rateLimitRemaining?: number }> {
    try {
      // Simple health check - try to make a minimal API call
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      
      if (response.ok) {
        return {
          status: 'healthy',
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
        };
      } else if (response.status === 429) {
        return { status: 'degraded', rateLimitRemaining: 0 };
      } else {
        return { status: 'down' };
      }
    } catch {
      return { status: 'down' };
    }
  }

  /**
   * Clean up debounce timers
   */
  dispose(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Export singleton instance
export const grokService = new GrokService();
export default grokService;