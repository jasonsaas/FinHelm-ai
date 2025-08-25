import { z } from 'zod';

/**
 * Agent types and schemas for the Custom Agent Builder
 * Aligned with the backend Convex schema
 */

// Enum values matching the Convex schema
export const AGENT_CATEGORIES = [
  'financial_intelligence',
  'supply_chain', 
  'revenue_customer',
  'it_operations',
  'custom'
] as const;

export const AGENT_TYPES = [
  'variance_explanation',
  'forecasting',
  'cash_flow_intelligence',
  'revenue_recognition',
  'close_acceleration',
  'board_presentation',
  'anomaly_monitoring',
  'inventory_optimization',
  'demand_forecasting',
  'vendor_risk',
  'cogs_attribution',
  'fill_rate_analytics',
  'supplier_integration',
  'sales_mix_margin',
  'churn_prediction',
  'revenue_decomposition',
  'sales_forecast',
  'customer_profitability',
  'upsell_expansion',
  'data_sync_health',
  'change_impact',
  'workflow_automation',
  'change_management_risk',
  'access_review',
  'multivariate_prediction',
  'custom'
] as const;

export const AI_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'claude-3-sonnet',
  'claude-3-opus', 
  'claude-3-haiku',
  'grok-beta'
] as const;

export const LANGUAGES = [
  'english',
  'spanish',
  'french',
  'german',
  'italian',
  'portuguese',
  'chinese',
  'japanese'
] as const;

// Zod schemas for validation
export const AgentConfigSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.enum(AI_MODELS),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4000),
  dataSource: z.array(z.string()).default([]),
  filters: z.optional(z.object({
    accounts: z.optional(z.array(z.string())),
    dateRange: z.optional(z.object({
      start: z.number(),
      end: z.number(),
    })),
    minAmount: z.optional(z.number()),
    maxAmount: z.optional(z.number()),
  })),
  schedule: z.optional(z.object({
    frequency: z.enum(['manual', 'daily', 'weekly', 'monthly']),
    time: z.optional(z.string()),
    timezone: z.optional(z.string()),
  })),
});

export const CustomAgentSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be less than 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  category: z.enum(AGENT_CATEGORIES),
  type: z.enum(AGENT_TYPES).default('custom'),
  language: z.enum(LANGUAGES).default('english'),
  config: AgentConfigSchema,
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(false),
});

export const AgentPreviewRequestSchema = z.object({
  agentData: CustomAgentSchema,
  testQuery: z.string().min(1, 'Test query is required'),
});

// TypeScript types
export type AgentCategory = typeof AGENT_CATEGORIES[number];
export type AgentType = typeof AGENT_TYPES[number];
export type AIModel = typeof AI_MODELS[number];
export type Language = typeof LANGUAGES[number];

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type CustomAgent = z.infer<typeof CustomAgentSchema>;
export type AgentPreviewRequest = z.infer<typeof AgentPreviewRequestSchema>;

// Form-specific interfaces
export interface CustomAgentFormData {
  name: string;
  description: string;
  model: AIModel;
  language: Language;
  prompt: string;
  category: AgentCategory;
  temperature: number;
  maxTokens: number;
}

export interface AgentExecutionResult {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: {
    query?: string;
    parameters?: Record<string, any>;
    dataRange?: {
      start: number;
      end: number;
    };
  };
  output?: {
    summary: string;
    dataOverview: {
      totalRecords: number;
      dateRange: {
        start: number;
        end: number;
      };
      keyMetrics: Array<{
        name: string;
        value: any;
        change?: number;
        trend?: 'up' | 'down' | 'flat';
      }>;
    };
    patterns: Array<{
      type: string;
      description: string;
      confidence: number;
      impact: 'high' | 'medium' | 'low';
      data?: any[];
    }>;
    actions: Array<{
      type: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      automated: boolean;
      dueDate?: number;
      assignee?: string;
    }>;
  };
  error?: string;
  executionTime?: number;
  tokensUsed?: number;
  cost?: number;
  startedAt: number;
  completedAt?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentDeploymentResponse extends ApiResponse<{
  agentId: string;
  status: string;
}> {}

export interface AgentPreviewResponse extends ApiResponse<{
  response: string;
  executionTime: number;
  tokensUsed: number;
}> {}