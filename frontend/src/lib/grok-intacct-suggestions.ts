import { grokClient, GrokMessage } from './grok-client';
import type { IntacctPreferences } from '../components/intacct-preferences';

export interface GrokPreferenceSuggestion {
  id: string;
  type: 'ui_optimization' | 'productivity_enhancement' | 'dashboard_layout' | 'workflow_improvement';
  title: string;
  description: string;
  category: 'general' | 'ui' | 'dashboard' | 'productivity' | 'ai';
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  suggestedChanges: {
    section: keyof IntacctPreferences;
    changes: Record<string, any>;
    explanation: string;
  };
  userBehaviorContext?: string;
  implementationSteps: string[];
  potentialBenefits: string[];
  tradeoffs?: string[];
}

export interface UserBehaviorData {
  sessionDuration: number;
  mostUsedFeatures: string[];
  frequentlyVisitedTabs: string[];
  commonWorkflows: string[];
  timeOfDayUsage: Record<string, number>;
  errorPatterns: string[];
  performanceIssues: string[];
  userRole: string;
  organizationType: string;
  industryType?: string;
}

export interface GrokSuggestionRequest {
  currentPreferences: IntacctPreferences;
  userBehavior: UserBehaviorData;
  suggestionTypes?: ('ui_optimization' | 'productivity_enhancement' | 'dashboard_layout' | 'workflow_improvement')[];
  maxSuggestions?: number;
  includeExplanations?: boolean;
}

export interface GrokSuggestionResponse {
  suggestions: GrokPreferenceSuggestion[];
  overallScore: number;
  generalRecommendations: string[];
  confidenceLevel: number;
  generatedAt: number;
}

export interface SuggestionFeedback {
  suggestionId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  implemented: boolean;
  helpful: boolean;
  comments?: string;
  improvements?: string[];
}

export class GrokIntacctSuggestionService {
  private conversationHistory: GrokMessage[] = [];
  private feedbackData: SuggestionFeedback[] = [];

  async generatePreferenceSuggestions(request: GrokSuggestionRequest): Promise<GrokSuggestionResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const messages: GrokMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.slice(-4), // Keep last 4 messages for context
        { role: 'user', content: userPrompt }
      ];

      const response = await grokClient.chat({
        messages,
        temperature: 0.6,
        max_tokens: 3000
      });

      const content = response.choices[0]?.message.content || '';
      this.conversationHistory.push(
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: content }
      );

      return this.parseSuggestionResponse(content, request);
    } catch (error) {
      console.error('Failed to generate Grok suggestions:', error);
      return this.getFallbackSuggestions(request);
    }
  }

  async getOptimizationTips(preferences: IntacctPreferences, focus?: string): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert UX consultant specializing in financial software optimization.
      Provide 3-5 specific, actionable tips to optimize the user's Sage Intacct experience based on their current preferences.
      Focus on practical improvements that will enhance productivity and user satisfaction.`;

      const userPrompt = `Based on these current Intacct preferences, provide optimization tips${focus ? ` focusing on ${focus}` : ''}:

Current Preferences:
${JSON.stringify(preferences, null, 2)}

Provide specific, actionable tips as a simple list.`;

      const response = await grokClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message.content || '';
      return this.extractTips(content);
    } catch (error) {
      console.error('Failed to get optimization tips:', error);
      return this.getFallbackTips(focus);
    }
  }

  async analyzeDashboardEfficiency(preferences: IntacctPreferences): Promise<{
    score: number;
    recommendations: string[];
    optimizedLayout: Record<string, any>;
  }> {
    try {
      const systemPrompt = `You are a dashboard optimization expert for financial software.
      Analyze the current dashboard widget configuration and provide an efficiency score (0-100) 
      along with specific recommendations for improvement and an optimized layout suggestion.`;

      const userPrompt = `Analyze this dashboard widget configuration for efficiency:

${JSON.stringify(preferences.dashboardWidgets, null, 2)}

User Role: ${preferences.userRole.name}
UI Settings: ${JSON.stringify(preferences.uiCustomizations, null, 2)}

Please provide:
1. Efficiency score (0-100)
2. Specific recommendations for improvement
3. Optimized layout suggestion with positions and sizes`;

      const response = await grokClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message.content || '';
      return this.parseDashboardAnalysis(content, preferences);
    } catch (error) {
      console.error('Failed to analyze dashboard efficiency:', error);
      return {
        score: 75,
        recommendations: ['Consider reorganizing widgets by priority', 'Enable disabled widgets that match your role'],
        optimizedLayout: preferences.dashboardWidgets
      };
    }
  }

  async submitSuggestionFeedback(feedback: SuggestionFeedback): Promise<void> {
    this.feedbackData.push({
      ...feedback,
    });

    // In a real implementation, you'd send this to your analytics service
    console.log('Suggestion feedback recorded:', feedback);

    // Learn from feedback for future suggestions
    this.incorporateFeedback(feedback);
  }

  async getPersonalizedInsights(preferences: IntacctPreferences, userRole: string): Promise<{
    insights: string[];
    roleSpecificTips: string[];
    industryBestPractices: string[];
  }> {
    try {
      const systemPrompt = `You are a financial software consultant with expertise in Sage Intacct.
      Provide personalized insights and best practices based on the user's role and current preferences.
      Focus on industry-standard practices and role-specific optimizations.`;

      const userPrompt = `Provide personalized insights for a ${userRole} using Sage Intacct with these preferences:

${JSON.stringify(preferences, null, 2)}

Please provide:
1. General insights about their current setup
2. Role-specific tips for ${userRole}s
3. Industry best practices for financial software usage`;

      const response = await grokClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message.content || '';
      return this.parsePersonalizedInsights(content);
    } catch (error) {
      console.error('Failed to get personalized insights:', error);
      return {
        insights: ['Your current setup provides a solid foundation for financial management'],
        roleSpecificTips: ['Consider enabling features specific to your role'],
        industryBestPractices: ['Regular preference reviews help maintain optimal productivity']
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are an AI expert in Sage Intacct user experience optimization and financial software productivity.
    
    Your role is to analyze user preferences and behavior patterns to generate intelligent suggestions for:
    1. UI/UX optimizations for better usability
    2. Productivity tool configurations for enhanced efficiency  
    3. Dashboard layout improvements for better information access
    4. Workflow optimizations based on user behavior patterns
    
    Guidelines:
    - Provide specific, actionable suggestions with clear implementation steps
    - Consider user role permissions and access levels
    - Focus on measurable productivity improvements
    - Include confidence scores based on data quality and pattern strength
    - Explain the reasoning behind each suggestion
    - Consider potential trade-offs and alternative approaches
    - Prioritize suggestions by expected impact and ease of implementation
    
    Response format should be structured JSON that can be parsed programmatically.
    Include confidence scores (0-1), impact levels (high/medium/low), and detailed explanations.`;
  }

  private buildUserPrompt(request: GrokSuggestionRequest): string {
    const { currentPreferences, userBehavior, suggestionTypes = ['ui_optimization', 'productivity_enhancement', 'dashboard_layout'], maxSuggestions = 5 } = request;

    return `Please analyze these user preferences and behavior data to generate intelligent suggestions:

CURRENT PREFERENCES:
${JSON.stringify(currentPreferences, null, 2)}

USER BEHAVIOR DATA:
${JSON.stringify(userBehavior, null, 2)}

SUGGESTION PARAMETERS:
- Focus on: ${suggestionTypes.join(', ')}
- Maximum suggestions: ${maxSuggestions}
- Include detailed explanations: ${request.includeExplanations ?? true}

FEEDBACK HISTORY:
${this.feedbackData.length > 0 ? JSON.stringify(this.feedbackData.slice(-5), null, 2) : 'No previous feedback available'}

Please provide suggestions that will help improve the user's Sage Intacct experience based on their usage patterns and current configuration.

Format the response as a JSON object with suggestions array, overall assessment, and recommendations.`;
  }

  private parseSuggestionResponse(content: string, request: GrokSuggestionRequest): GrokSuggestionResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatResponse(parsed);
      }
    } catch (error) {
      console.warn('Failed to parse JSON response, using fallback parsing', error);
    }

    // Fallback parsing for non-JSON responses
    return this.parsePlainTextResponse(content, request);
  }

  private validateAndFormatResponse(parsed: any): GrokSuggestionResponse {
    return {
      suggestions: (parsed.suggestions || []).map((s: any, index: number) => ({
        id: s.id || `suggestion_${index}`,
        type: s.type || 'ui_optimization',
        title: s.title || 'Optimization Suggestion',
        description: s.description || 'Improve your Intacct experience',
        category: s.category || 'general',
        impact: s.impact || 'medium',
        confidence: Math.min(1, Math.max(0, s.confidence || 0.7)),
        suggestedChanges: s.suggestedChanges || {
          section: 'uiCustomizations',
          changes: {},
          explanation: 'Configuration optimization recommended'
        },
        userBehaviorContext: s.userBehaviorContext || '',
        implementationSteps: s.implementationSteps || ['Apply the suggested changes'],
        potentialBenefits: s.potentialBenefits || ['Improved user experience'],
        tradeoffs: s.tradeoffs
      })),
      overallScore: Math.min(100, Math.max(0, parsed.overallScore || 80)),
      generalRecommendations: parsed.generalRecommendations || ['Regular preference reviews are recommended'],
      confidenceLevel: Math.min(1, Math.max(0, parsed.confidenceLevel || 0.7)),
      generatedAt: Date.now()
    };
  }

  private parsePlainTextResponse(content: string, request: GrokSuggestionRequest): GrokSuggestionResponse {
    const lines = content.split('\n').filter(line => line.trim());
    const suggestions: GrokPreferenceSuggestion[] = [];
    
    // Simple parsing logic for plain text responses
    for (let i = 0; i < Math.min(request.maxSuggestions || 5, 3); i++) {
      suggestions.push({
        id: `suggestion_${i}`,
        type: request.suggestionTypes?.[i % request.suggestionTypes.length] || 'ui_optimization',
        title: `Optimization Suggestion ${i + 1}`,
        description: lines[i] || 'Based on your usage patterns, consider adjusting your preferences for better efficiency',
        category: 'general',
        impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
        confidence: 0.7,
        suggestedChanges: {
          section: 'uiCustomizations',
          changes: {},
          explanation: 'General optimization recommended'
        },
        implementationSteps: ['Review the suggestion', 'Apply the changes', 'Monitor the results'],
        potentialBenefits: ['Improved productivity', 'Better user experience']
      });
    }

    return {
      suggestions,
      overallScore: 75,
      generalRecommendations: ['Consider reviewing your preferences regularly'],
      confidenceLevel: 0.7,
      generatedAt: Date.now()
    };
  }

  private getFallbackSuggestions(request: GrokSuggestionRequest): GrokSuggestionResponse {
    const fallbackSuggestions: GrokPreferenceSuggestion[] = [
      {
        id: 'fallback_1',
        type: 'ui_optimization',
        title: 'Enable Compact Mode',
        description: 'Switch to compact mode to see more information on screen and reduce scrolling',
        category: 'ui',
        impact: 'medium',
        confidence: 0.8,
        suggestedChanges: {
          section: 'uiCustomizations',
          changes: { compactMode: true },
          explanation: 'Compact mode reduces white space and shows more data per screen'
        },
        implementationSteps: [
          'Go to UI Customization tab',
          'Toggle Compact Mode setting',
          'Save your preferences'
        ],
        potentialBenefits: [
          'See more data at once',
          'Reduce scrolling',
          'Improve information density'
        ]
      },
      {
        id: 'fallback_2',
        type: 'productivity_enhancement',
        title: 'Enable Keyboard Shortcuts',
        description: 'Turn on all keyboard shortcuts to speed up common tasks',
        category: 'productivity',
        impact: 'high',
        confidence: 0.9,
        suggestedChanges: {
          section: 'productivityTools',
          changes: {
            keyboardShortcuts: {
              'Ctrl+S': true,
              'Ctrl+N': true,
              'Ctrl+F': true,
              'Ctrl+Z': true,
              'Ctrl+Y': true
            }
          },
          explanation: 'Keyboard shortcuts significantly reduce time spent on repetitive tasks'
        },
        implementationSteps: [
          'Navigate to Productivity tab',
          'Enable all keyboard shortcuts',
          'Practice using shortcuts in daily work'
        ],
        potentialBenefits: [
          'Faster task completion',
          'Reduced mouse usage',
          'Improved workflow efficiency'
        ]
      }
    ];

    return {
      suggestions: fallbackSuggestions,
      overallScore: 70,
      generalRecommendations: [
        'AI suggestions are currently unavailable, showing basic optimizations',
        'Consider enabling Grok AI for personalized recommendations'
      ],
      confidenceLevel: 0.6,
      generatedAt: Date.now()
    };
  }

  private extractTips(content: string): string[] {
    const lines = content.split('\n');
    const tips: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const tip = trimmed.replace(/^[•\-\d\.]\s*/, '').trim();
        if (tip.length > 10) {
          tips.push(tip);
        }
      }
    }

    return tips.length > 0 ? tips : this.getFallbackTips();
  }

  private getFallbackTips(focus?: string): string[] {
    const baseTips = [
      'Enable auto-save to prevent data loss',
      'Organize dashboard widgets by priority',
      'Use keyboard shortcuts for faster navigation',
      'Enable high contrast mode for better visibility',
      'Set up smart suggestions for better recommendations'
    ];

    if (focus) {
      return [`Consider optimizing ${focus} settings`, ...baseTips.slice(0, 3)];
    }

    return baseTips;
  }

  private parseDashboardAnalysis(content: string, preferences: IntacctPreferences) {
    // Extract score from content
    const scoreMatch = content.match(/(?:score|efficiency).*?(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    // Extract recommendations
    const recommendations = this.extractTips(content);

    return {
      score: Math.min(100, Math.max(0, score)),
      recommendations: recommendations.length > 0 ? recommendations : [
        'Consider reorganizing widgets by priority',
        'Enable widgets that match your role',
        'Adjust widget sizes based on importance'
      ],
      optimizedLayout: preferences.dashboardWidgets
    };
  }

  private parsePersonalizedInsights(content: string) {
    const sections = content.split(/(?:insights|tips|practices):/i);
    
    return {
      insights: this.extractTips(sections[1] || content),
      roleSpecificTips: this.extractTips(sections[2] || content),
      industryBestPractices: this.extractTips(sections[3] || content)
    };
  }

  private incorporateFeedback(feedback: SuggestionFeedback): void {
    // In a real implementation, you'd use this feedback to improve future suggestions
    if (feedback.rating <= 2 && feedback.comments) {
      console.log('Negative feedback received, will avoid similar suggestions:', feedback.comments);
    }
    
    if (feedback.implemented && feedback.helpful) {
      console.log('Positive feedback received, will prioritize similar suggestions');
    }
  }
}

export const grokSuggestionService = new GrokIntacctSuggestionService();