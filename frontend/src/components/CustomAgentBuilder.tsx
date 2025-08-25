import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextareaAutosize from 'react-textarea-autosize';
import { 
  Brain, 
  Save, 
  Play, 
  AlertCircle, 
  Loader2,
  Eye,
  Settings,
  Sparkles,
  Activity,
  Clock,
  DollarSign
} from 'lucide-react';
import { clsx } from 'clsx';
import { useGrokPreview } from '../hooks/useGrokPreview';

/**
 * Form validation schema for custom agent creation
 * Defines validation rules for all form fields including required fields,
 * length limits, and data type constraints
 */
const customAgentSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be less than 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  model: z.enum([
    'gpt-4',
    'gpt-4-turbo', 
    'claude-3-sonnet',
    'claude-3-opus',
    'claude-3-haiku',
    'grok-beta'
  ]),
  language: z.enum([
    'english',
    'spanish', 
    'french',
    'german',
    'italian',
    'portuguese',
    'chinese',
    'japanese'
  ]),
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(4000, 'Prompt must be less than 4000 characters'),
  category: z.enum([
    'financial_intelligence',
    'supply_chain',
    'revenue_customer', 
    'it_operations',
    'custom'
  ]),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
});

/**
 * Type definition for form data based on validation schema
 */
type CustomAgentFormData = z.infer<typeof customAgentSchema>;

/**
 * Props interface for the CustomAgentBuilder component
 */
interface CustomAgentBuilderProps {
  /** Callback function called when the form is submitted with valid data */
  onSubmit?: (data: CustomAgentFormData) => Promise<void>;
  /** Initial data to populate the form fields */
  initialData?: Partial<CustomAgentFormData>;
  /** Whether the form submission is in progress */
  isLoading?: boolean;
  /** Organization ID for API calls and permissions */
  organizationId?: string;
  /** User ID for API calls and audit logging */
  userId?: string;
}

/**
 * Sample financial scenarios for testing agent responses
 * These scenarios represent common use cases in financial operations
 */
const SAMPLE_SCENARIOS = [
  'Rewrite this expense report as a professional email to management',
  'Categorize this transaction: $2,500 payment to ABC Software Solutions',
  'Analyze this monthly revenue variance and explain the key drivers',
  'Generate a cash flow forecast summary for the next quarter',
  'Create an executive summary of accounts payable aging analysis'
];

/**
 * CustomAgentBuilder Component
 * 
 * A comprehensive form component for creating and configuring AI-powered financial assistants.
 * Features include form validation, real-time preview with Grok API integration, multiple AI models,
 * and pre-built financial scenarios for testing.
 * 
 * @param props - Component props
 * @returns JSX element representing the custom agent builder interface
 * 
 * @example
 * ```tsx
 * <CustomAgentBuilder
 *   organizationId="org-123"
 *   userId="user-456"
 *   onSubmit={handleAgentCreation}
 *   initialData={{
 *     name: 'Financial Assistant',
 *     model: 'gpt-4',
 *     language: 'english'
 *   }}
 * />
 * ```
 */
export function CustomAgentBuilder({ 
  onSubmit, 
  initialData,
  isLoading = false,
  organizationId,
  userId
}: CustomAgentBuilderProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [testQuery, setTestQuery] = useState(SAMPLE_SCENARIOS[0]);

  // Grok preview integration
  const {
    previewResponse,
    isLoading: previewLoading,
    error: previewError,
    executionTime,
    tokensUsed,
    cost,
    isHealthy,
    rateLimitRemaining,
    preview,
    clearPreview,
  } = useGrokPreview({
    organizationId,
    userId,
    debounceMs: 1500, // Longer debounce for better UX
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<CustomAgentFormData>({
    resolver: zodResolver(customAgentSchema),
    mode: 'onChange',
    defaultValues: {
      model: 'gpt-4',
      language: 'english',
      category: 'custom',
      temperature: 0.7,
      maxTokens: 1000,
      ...initialData
    }
  });

  const watchedData = watch();
  
  const characterCount = useMemo(() => {
    return {
      name: watchedData.name?.length || 0,
      description: watchedData.description?.length || 0,
      prompt: watchedData.prompt?.length || 0,
    };
  }, [watchedData.name, watchedData.description, watchedData.prompt]);

  const handlePreview = async () => {
    if (!testQuery.trim()) return;
    
    try {
      await preview(watchedData, testQuery);
      setIsPreviewMode(true);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Preview failed:', error);
    }
  };

  const onFormSubmit = async (data: CustomAgentFormData) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Agent Builder</h1>
            <p className="text-sm text-gray-600">Create intelligent financial AI assistants</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* API Health Indicator */}
          <div className="flex items-center space-x-2">
            <Activity className={clsx(
              'h-4 w-4',
              isHealthy ? 'text-green-600' : 'text-red-600'
            )} />
            <span className={clsx(
              'text-xs',
              isHealthy ? 'text-green-600' : 'text-red-600'
            )}>
              Grok API {isHealthy ? 'Online' : 'Offline'}
            </span>
            {rateLimitRemaining !== null && (
              <span className="text-xs text-gray-500">
                ({rateLimitRemaining} requests left)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={clsx(
              'btn-secondary flex items-center space-x-2',
              isPreviewMode && 'bg-blue-100 text-blue-700'
            )}
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="card">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  placeholder="e.g., Financial Email Assistant"
                  className={clsx(
                    'input',
                    errors.name && 'border-red-300 focus:ring-red-500'
                  )}
                />
                <div className="flex justify-between mt-1">
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.name.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {characterCount.name}/100
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <TextareaAutosize
                  {...register('description')}
                  id="description"
                  placeholder="Describe what this agent does and its use cases..."
                  minRows={2}
                  className={clsx(
                    'input resize-none',
                    errors.description && 'border-red-300 focus:ring-red-500'
                  )}
                />
                <div className="flex justify-between mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.description.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {characterCount.description}/500
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    id="category"
                    className="input"
                  >
                    <option value="custom">Custom</option>
                    <option value="financial_intelligence">Financial Intelligence</option>
                    <option value="supply_chain">Supply Chain</option>
                    <option value="revenue_customer">Revenue & Customer</option>
                    <option value="it_operations">IT Operations</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    {...register('language')}
                    id="language"
                    className="input"
                  >
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                    <option value="german">German</option>
                    <option value="italian">Italian</option>
                    <option value="portuguese">Portuguese</option>
                    <option value="chinese">Chinese</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Configuration */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <select
                  {...register('model')}
                  id="model"
                  className="input"
                >
                  <option value="gpt-4">GPT-4 (Recommended)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                  <option value="grok-beta">Grok Beta</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                    Creativity (Temperature)
                  </label>
                  <input
                    {...register('temperature', { valueAsNumber: true })}
                    type="range"
                    id="temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span className="font-medium">{watchedData.temperature}</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Response Length
                  </label>
                  <select
                    {...register('maxTokens', { valueAsNumber: true })}
                    id="maxTokens"
                    className="input"
                  >
                    <option value={500}>Short (500 tokens)</option>
                    <option value={1000}>Medium (1000 tokens)</option>
                    <option value={2000}>Long (2000 tokens)</option>
                    <option value={4000}>Very Long (4000 tokens)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Configuration */}
            <div className="space-y-4 border-t pt-6">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                  System Prompt
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Define how your AI agent should behave and respond to user queries.
                </p>
                <TextareaAutosize
                  {...register('prompt')}
                  id="prompt"
                  placeholder="You are a financial AI assistant. Your role is to..."
                  minRows={6}
                  className={clsx(
                    'input resize-none font-mono text-sm',
                    errors.prompt && 'border-red-300 focus:ring-red-500'
                  )}
                />
                <div className="flex justify-between mt-1">
                  {errors.prompt && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.prompt.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {characterCount.prompt}/4000
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!isValid || previewLoading}
                className="btn-secondary flex items-center space-x-2"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>Test Agent</span>
              </button>

              <button
                type="submit"
                disabled={!isValid || isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Deploy Agent</span>
              </button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        {isPreviewMode && (
          <div className="card">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Agent Preview
              </h2>

              <div>
                <label htmlFor="testQuery" className="block text-sm font-medium text-gray-700 mb-2">
                  Test Query
                </label>
                <select
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="input mb-2"
                >
                  {SAMPLE_SCENARIOS.map((scenario, index) => (
                    <option key={index} value={scenario}>
                      {scenario.length > 60 ? `${scenario.substring(0, 60)}...` : scenario}
                    </option>
                  ))}
                </select>
                <TextareaAutosize
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Or enter your own test query..."
                  minRows={2}
                  className="input resize-none"
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={!testQuery.trim() || previewLoading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>Run Preview</span>
              </button>

              {previewError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Preview Error</h4>
                      <p className="text-sm text-red-700 mt-1">{previewError}</p>
                    </div>
                  </div>
                </div>
              )}

              {previewResponse && (
                <div className="space-y-4">
                  {/* Response Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{executionTime}ms</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Brain className="h-3 w-3" />
                      <span>{tokensUsed} tokens</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <DollarSign className="h-3 w-3" />
                      <span>${cost.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Agent Response:</h3>
                      <button
                        onClick={clearPreview}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {previewResponse}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { CustomAgentFormData };