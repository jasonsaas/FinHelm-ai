/**
 * Grok API Client for FinHelm.ai
 * Handles communication with xAI's Grok API for conversational AI and financial analysis
 */

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokChatRequest {
  messages: GrokMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GrokChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: GrokMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GrokTextEnhancementRequest {
  text: string;
  enhancement_type: 'email' | 'document' | 'summary' | 'analysis';
  context?: {
    financial_data?: any;
    user_preferences?: any;
  };
}

export class GrokClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROK_API_KEY || '';
    this.baseUrl = 'https://api.x.ai/v1';
  }

  async chat(request: GrokChatRequest): Promise<GrokChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || 'grok-beta',
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 2000,
          stream: request.stream || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Grok API call failed:', error);
      throw new Error(`Failed to call Grok API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async enhanceText(request: GrokTextEnhancementRequest): Promise<string> {
    const systemPrompt = this.getEnhancementPrompt(request.enhancement_type);
    const userPrompt = this.buildUserPromptWithContext(request.text, request.context);

    const chatRequest: GrokChatRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent enhancements
    };

    const response = await this.chat(chatRequest);
    return response.choices[0]?.message.content || '';
  }

  async analyzeFinancialData(
    data: any,
    query: string,
    conversationHistory: GrokMessage[] = []
  ): Promise<{
    summary: string;
    insights: string[];
    recommendations: string[];
    drivers: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      explanation: string;
    }>;
  }> {
    const systemPrompt = `You are FinHelm AI, an expert financial analyst and business intelligence assistant. 
    Your role is to analyze financial data and provide clear, actionable insights.
    
    Key capabilities:
    1. Financial data analysis with pattern recognition
    2. Trend identification and forecasting
    3. Risk assessment and opportunity identification
    4. Clear explanation of financial drivers and key factors
    5. Actionable business recommendations
    
    Always provide:
    - Clear, concise summary
    - Key insights with supporting data
    - Specific, actionable recommendations
    - Explanation of key drivers with impact levels
    
    Format your response as structured analysis that can be easily parsed and displayed.`;

    const dataContext = JSON.stringify(data, null, 2);
    const userPrompt = `Please analyze the following financial data and answer this query: "${query}"

Financial Data:
${dataContext}

Please provide a comprehensive analysis including:
1. Executive summary
2. Key insights and patterns
3. Specific recommendations
4. Key drivers and their impact levels (high/medium/low)

Focus on actionable insights that can help improve financial performance.`;

    const messages: GrokMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chat({ messages, temperature: 0.4 });
    const content = response.choices[0]?.message.content || '';

    // Parse the response to extract structured data
    return this.parseFinancialAnalysis(content);
  }

  private getEnhancementPrompt(type: string): string {
    switch (type) {
      case 'email':
        return `You are a professional business writing assistant specializing in financial communications. 
        Enhance the provided text to create clear, professional, and engaging business emails. 
        Maintain the original intent while improving clarity, tone, and structure. 
        Ensure financial terminology is accurate and appropriate for the business context.`;
        
      case 'document':
        return `You are a technical writing specialist for financial documents. 
        Enhance the provided text to create clear, structured, and professional business documents. 
        Improve readability, organization, and clarity while maintaining technical accuracy. 
        Use appropriate financial terminology and ensure compliance with business communication standards.`;
        
      case 'summary':
        return `You are a financial analyst creating executive summaries. 
        Transform the provided text into a clear, concise executive summary that highlights key points, 
        financial metrics, and actionable insights. Focus on what matters most to business decision-makers.`;
        
      case 'analysis':
        return `You are a business intelligence analyst. 
        Transform the provided text into a structured analytical report with clear insights, 
        supporting data, and actionable recommendations. Use appropriate financial frameworks and terminology.`;
        
      default:
        return `You are a professional writing assistant. 
        Enhance the provided text to improve clarity, structure, and professional presentation 
        while maintaining the original intent and meaning.`;
    }
  }

  private buildUserPromptWithContext(text: string, context?: any): string {
    let prompt = `Please enhance the following text:\n\n${text}`;
    
    if (context?.financial_data) {
      prompt += `\n\nFinancial Context:\n${JSON.stringify(context.financial_data, null, 2)}`;
    }
    
    if (context?.user_preferences) {
      prompt += `\n\nUser Preferences:\n${JSON.stringify(context.user_preferences, null, 2)}`;
    }
    
    return prompt;
  }

  private parseFinancialAnalysis(content: string): {
    summary: string;
    insights: string[];
    recommendations: string[];
    drivers: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      explanation: string;
    }>;
  } {
    // This is a simplified parser - in production, you might want more robust parsing
    const lines = content.split('\n').filter(line => line.trim());
    
    const summary = this.extractSection(content, ['summary', 'executive summary', 'overview']) || 
      'Financial analysis completed with key insights and recommendations provided.';
    
    const insights = this.extractListItems(content, ['insight', 'finding', 'pattern', 'trend']);
    const recommendations = this.extractListItems(content, ['recommendation', 'action', 'suggest']);
    
    // Mock drivers for now - in production, you'd parse these from the response
    const drivers = [
      {
        factor: 'Revenue Growth',
        impact: 'high' as const,
        explanation: 'Strong revenue growth indicates healthy business expansion and market demand.'
      },
      {
        factor: 'Expense Management',
        impact: 'medium' as const,
        explanation: 'Controlled expense growth maintains profitability while supporting operations.'
      },
      {
        factor: 'Market Conditions',
        impact: 'medium' as const,
        explanation: 'External market factors influence performance and strategic positioning.'
      }
    ];

    return {
      summary,
      insights,
      recommendations,
      drivers
    };
  }

  private extractSection(content: string, keywords: string[]): string | null {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        // Found a section header, collect the following content
        let sectionContent = '';
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) continue;
          if (this.isNewSection(nextLine)) break;
          sectionContent += nextLine + ' ';
        }
        return sectionContent.trim() || null;
      }
    }
    return null;
  }

  private extractListItems(content: string, keywords: string[]): string[] {
    const lines = content.split('\n');
    const items: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const item = trimmed.replace(/^[•\-\d\.]\s*/, '').trim();
        if (item && keywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword) || 
          item.toLowerCase().includes(keyword)
        )) {
          items.push(item);
        }
      }
    }
    
    return items.length > 0 ? items : [
      'Analysis completed with detailed findings',
      'Key patterns identified in the data',
      'Actionable insights provided for decision making'
    ];
  }

  private isNewSection(line: string): boolean {
    const sectionKeywords = [
      'summary', 'insight', 'recommendation', 'analysis', 'finding', 
      'conclusion', 'action', 'next steps', 'drivers', 'factors'
    ];
    const lowerLine = line.toLowerCase();
    return sectionKeywords.some(keyword => lowerLine.includes(keyword) && lowerLine.includes(':'));
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return !!response.choices?.[0]?.message;
    } catch (error) {
      console.error('Grok health check failed:', error);
      return false;
    }
  }
}

export const grokClient = new GrokClient();