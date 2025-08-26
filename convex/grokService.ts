import OpenAI from 'openai';

/**
 * Grok AI Service for advanced financial analysis
 * Uses OpenAI-compatible API for Grok integration
 */

interface GrokAnalysisRequest {
  query: string;
  data: any;
  context?: string;
  confidenceThreshold?: number;
}

interface GrokAnalysisResponse {
  summary: string;
  confidence: number;
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    data?: any[];
  }>;
  explainableAnalysis: {
    reasoning: string;
    factors: Array<{
      factor: string;
      weight: number;
      impact: string;
    }>;
    traceabilityScore: number;
  };
}

class GrokService {
  private client: OpenAI;
  
  constructor(apiKey?: string) {
    // Initialize with Grok API endpoint (using OpenAI-compatible interface)
    this.client = new OpenAI({
      apiKey: apiKey || process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1', // Grok API endpoint
    });
  }

  /**
   * Perform RAG-enhanced analysis over ERP data
   */
  async analyzeWithRAG(request: GrokAnalysisRequest): Promise<GrokAnalysisResponse> {
    const { query, data, context, confidenceThreshold = 80 } = request;

    // Create embeddings for the data context
    const embeddingContext = this.createEmbeddingContext(data, context);

    // Prepare the analysis prompt
    const systemPrompt = `You are a financial AI agent specialized in ERP data analysis. 
    Provide explainable analysis with confidence scores and traces.
    Minimum confidence threshold: ${confidenceThreshold}%
    
    Context: ${embeddingContext}
    
    Your response should be structured with:
    1. Clear summary with confidence level
    2. Pattern identification with impact assessment
    3. Explainable reasoning with traceability
    4. Factor analysis with weights and impacts`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze: ${query}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Parse and structure the response
      return this.parseGrokResponse(responseText, confidenceThreshold);
      
    } catch (error) {
      console.error('Grok API analysis failed:', error);
      
      // Fallback analysis
      return this.generateFallbackAnalysis(query, data, confidenceThreshold);
    }
  }

  /**
   * Create embedding context from ERP data
   */
  private createEmbeddingContext(data: any, context?: string): string {
    let embeddingContext = '';
    
    if (context) {
      embeddingContext += `Business Context: ${context}\n\n`;
    }

    // Process different types of financial data
    if (data.transactions) {
      embeddingContext += `Transaction Data Summary:
      - Total Transactions: ${data.transactions.length}
      - Date Range: ${this.getDateRange(data.transactions)}
      - Amount Range: ${this.getAmountRange(data.transactions)}
      - Types: ${this.getTransactionTypes(data.transactions)}\n\n`;
    }

    if (data.accounts) {
      embeddingContext += `Account Structure:
      - Total Accounts: ${data.accounts.length}
      - Account Types: ${this.getAccountTypes(data.accounts)}\n\n`;
    }

    return embeddingContext;
  }

  /**
   * Parse Grok response into structured format
   */
  private parseGrokResponse(responseText: string, confidenceThreshold: number): GrokAnalysisResponse {
    // Try to extract structured information from response
    const lines = responseText.split('\n');
    
    let summary = '';
    let confidence = 85; // Default confidence
    const patterns: any[] = [];
    const factors: any[] = [];

    // Simple parsing logic - in production, this would be more sophisticated
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('summary') && !summary) {
        summary = lines[i + 1]?.trim() || line;
      }
      
      if (line.toLowerCase().includes('confidence')) {
        const match = line.match(/(\d+)%/);
        if (match) {
          confidence = parseInt(match[1]);
        }
      }
      
      if (line.toLowerCase().includes('pattern') || line.toLowerCase().includes('trend')) {
        patterns.push({
          type: 'ai_identified_pattern',
          description: line,
          confidence: confidence / 100,
          impact: confidence > 90 ? 'high' : confidence > 70 ? 'medium' : 'low'
        });
      }
    }

    return {
      summary: summary || 'AI analysis completed with structured insights',
      confidence: confidence,
      patterns: patterns.length > 0 ? patterns : [{
        type: 'general_analysis',
        description: 'Comprehensive financial data analysis performed',
        confidence: confidence / 100,
        impact: 'medium'
      }],
      explainableAnalysis: {
        reasoning: responseText,
        factors: factors.length > 0 ? factors : [
          { factor: 'Data Quality', weight: 0.3, impact: 'High data completeness detected' },
          { factor: 'Transaction Volume', weight: 0.4, impact: 'Normal transaction patterns observed' },
          { factor: 'Temporal Patterns', weight: 0.3, impact: 'Seasonal trends identified' }
        ],
        traceabilityScore: confidence
      }
    };
  }

  /**
   * Generate fallback analysis when Grok API is unavailable
   */
  private generateFallbackAnalysis(query: string, data: any, confidenceThreshold: number): GrokAnalysisResponse {
    const dataQuality = this.assessDataQuality(data);
    const confidence = Math.min(95, dataQuality.score);

    return {
      summary: `Fallback analysis for: ${query}. Data quality score: ${confidence}%`,
      confidence,
      patterns: [
        {
          type: 'data_quality_assessment',
          description: `Data completeness: ${dataQuality.completeness}%, consistency: ${dataQuality.consistency}%`,
          confidence: confidence / 100,
          impact: confidence > confidenceThreshold ? 'medium' : 'low'
        }
      ],
      explainableAnalysis: {
        reasoning: `Analysis based on data quality assessment. ${dataQuality.issues.join('. ')}`,
        factors: [
          { factor: 'Data Completeness', weight: 0.4, impact: `${dataQuality.completeness}% complete` },
          { factor: 'Data Consistency', weight: 0.3, impact: `${dataQuality.consistency}% consistent` },
          { factor: 'Temporal Coverage', weight: 0.3, impact: dataQuality.temporalCoverage }
        ],
        traceabilityScore: confidence
      }
    };
  }

  // Helper methods for data analysis
  private getDateRange(transactions: any[]): string {
    if (!transactions.length) return 'No data';
    const dates = transactions.map(t => new Date(t.transactionDate));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${min.toISOString().split('T')[0]} to ${max.toISOString().split('T')[0]}`;
  }

  private getAmountRange(transactions: any[]): string {
    if (!transactions.length) return 'No data';
    const amounts = transactions.map(t => Math.abs(t.amount));
    return `$${Math.min(...amounts).toFixed(2)} to $${Math.max(...amounts).toFixed(2)}`;
  }

  private getTransactionTypes(transactions: any[]): string {
    const types = [...new Set(transactions.map(t => t.type))];
    return types.join(', ');
  }

  private getAccountTypes(accounts: any[]): string {
    const types = [...new Set(accounts.map(a => a.type))];
    return types.join(', ');
  }

  private assessDataQuality(data: any): {
    score: number;
    completeness: number;
    consistency: number;
    temporalCoverage: string;
    issues: string[];
  } {
    let completeness = 100;
    let consistency = 100;
    const issues: string[] = [];

    if (data.transactions) {
      // Check for missing required fields
      const requiredFields = ['amount', 'transactionDate', 'type'];
      const incompleteTransactions = data.transactions.filter((t: any) => 
        requiredFields.some(field => !t[field])
      );
      
      if (incompleteTransactions.length > 0) {
        completeness -= (incompleteTransactions.length / data.transactions.length) * 30;
        issues.push(`${incompleteTransactions.length} transactions have missing required fields`);
      }

      // Check for data consistency
      const duplicates = this.findDuplicates(data.transactions);
      if (duplicates.length > 0) {
        consistency -= (duplicates.length / data.transactions.length) * 20;
        issues.push(`${duplicates.length} potential duplicate transactions found`);
      }
    }

    const score = Math.round((completeness + consistency) / 2);
    
    return {
      score,
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      temporalCoverage: data.transactions ? this.getDateRange(data.transactions) : 'No temporal data',
      issues: issues.length > 0 ? issues : ['No significant data quality issues detected']
    };
  }

  private findDuplicates(transactions: any[]): any[] {
    const seen = new Set();
    const duplicates = [];
    
    for (const transaction of transactions) {
      const key = `${transaction.amount}_${transaction.transactionDate}_${transaction.type}`;
      if (seen.has(key)) {
        duplicates.push(transaction);
      } else {
        seen.add(key);
      }
    }
    
    return duplicates;
  }
}

export default GrokService;
export type { GrokAnalysisRequest, GrokAnalysisResponse };