import React, { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Send, 
  Save, 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Code, 
  Bot, 
  Globe, 
  Settings,
  Eye,
  History,
  Copy,
  Plus,
  Trash2,
  Zap,
  Clock,
  Database,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import useGrokPreview, { FINANCIAL_SCENARIOS } from '../hooks/useGrokPreview';
import VersionManager from './VersionManager';

// Validation schema for the agent builder form
const AgentBuilderSchema = z.object({
  name: z.string()
    .min(3, 'Agent name must be at least 3 characters')
    .max(50, 'Agent name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Agent name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must be less than 200 characters'),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'grok-beta', 'claude-3-sonnet', 'claude-3-haiku'], {
    errorMap: () => ({ message: 'Please select a valid AI model' })
  }),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh'], {
    errorMap: () => ({ message: 'Please select a valid language' })
  }),
  prompt: z.string()
    .min(50, 'Prompt must be at least 50 characters')
    .max(2000, 'Prompt must be less than 2000 characters'),
  category: z.enum([
    'financial_intelligence',
    'supply_chain', 
    'revenue_customer',
    'it_operations',
    'custom'
  ]),
  userDefinedCalls: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Call name is required'),
    description: z.string().min(1, 'Call description is required'),
    prompt: z.string().min(1, 'Call prompt is required')
  })).optional().default([]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)').default('1.0.0')
});

type AgentBuilderForm = z.infer<typeof AgentBuilderSchema>;

// Model options with descriptions
const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4', description: 'Most capable, best for complex analysis' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient, good balance' },
  { value: 'grok-beta', label: 'Grok Beta', description: 'Real-time data access, conversational' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Balanced performance and speed' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast responses, cost-effective' },
];

// Language options
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
];

// Category options
const CATEGORY_OPTIONS = [
  { value: 'financial_intelligence', label: 'Financial Intelligence', icon: '💰' },
  { value: 'supply_chain', label: 'Supply Chain', icon: '🚚' },
  { value: 'revenue_customer', label: 'Revenue & Customer', icon: '📈' },
  { value: 'it_operations', label: 'IT Operations', icon: '🔧' },
  { value: 'custom', label: 'Custom', icon: '🎨' },
];

// Example prompts for different categories
const PROMPT_EXAMPLES = {
  financial_intelligence: `You are a financial intelligence agent specializing in analyzing financial data and providing insights. 

Your role is to:
- Analyze financial transactions and identify patterns
- Provide variance explanations for budget vs actual performance
- Generate cash flow forecasts and liquidity analysis
- Identify anomalies in financial data
- Suggest cost optimization opportunities

Always provide clear, actionable insights with specific numbers and recommendations.`,

  supply_chain: `You are a supply chain optimization agent focused on inventory and logistics analysis.

Your capabilities include:
- Inventory level optimization and demand forecasting
- Vendor performance analysis and risk assessment
- Supply chain cost analysis and optimization
- Logistics efficiency evaluation
- Procurement process improvements

Provide data-driven recommendations to improve supply chain efficiency and reduce costs.`,

  revenue_customer: `You are a revenue and customer analytics agent specializing in growth analysis.

Your expertise covers:
- Customer profitability analysis and segmentation
- Revenue decomposition and trend analysis
- Churn prediction and retention strategies
- Sales forecasting and pipeline analysis
- Upselling and cross-selling opportunities

Focus on actionable insights that drive revenue growth and customer satisfaction.`,

  it_operations: `You are an IT operations intelligence agent focused on system performance and efficiency.

Your responsibilities include:
- System performance monitoring and optimization
- Change impact analysis and risk assessment
- Workflow automation opportunities
- Access review and security analysis
- Infrastructure cost optimization

Provide technical insights that improve operational efficiency and reduce IT costs.`,

  custom: `You are a custom AI agent designed for specific business needs.

Please define your specific capabilities and focus areas in this prompt. Consider:
- What data sources you'll analyze
- What types of insights you'll provide
- What actions you'll recommend
- What business outcomes you'll support

Customize this prompt to match your specific use case and requirements.`
};

interface CustomBuilderUIProps {
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  onAgentCreated?: (agentId: Id<"agents">) => void;
  initialData?: Partial<AgentBuilderForm>;
  className?: string;
}

interface SelectedScenario {
  id: string;
  name: string;
}

export function CustomBuilderUI({
  organizationId,
  userId,
  onAgentCreated,
  initialData,
  className
}: CustomBuilderUIProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [deploymentMessage, setDeploymentMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'versions'>('builder');
  const [selectedScenario, setSelectedScenario] = useState<SelectedScenario | null>(null);

  // Convex mutations
  const createAgent = useMutation(api.agentActions.createAgent);

  // Grok preview hook
  const {
    isLoading: previewLoading,
    error: previewError,
    preview,
    generatePreview,
    generatePreviewWithScenario,
    cancelPreview,
    clearPreview,
    getCacheStats,
    scenarios,
    isDebouncing
  } = useGrokPreview();

  // Form setup with validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
    reset,
    trigger
  } = useForm<AgentBuilderForm>({
    resolver: zodResolver(AgentBuilderSchema),
    defaultValues: {
      name: '',
      description: '',
      model: 'gpt-4',
      language: 'en',
      prompt: '',
      category: 'custom',
      userDefinedCalls: [],
      version: '1.0.0',
      ...initialData
    },
    mode: 'onChange'
  });

  // Watch form values for real-time updates
  const watchedValues = watch();
  const watchedPrompt = watch('prompt');
  const watchedModel = watch('model');
  const watchedCategory = watch('category');
  const watchedUserDefinedCalls = watch('userDefinedCalls');

  // Auto-update prompt based on category
  React.useEffect(() => {
    if (watchedCategory && !watchedPrompt) {
      setValue('prompt', PROMPT_EXAMPLES[watchedCategory]);
      trigger('prompt');
    }
  }, [watchedCategory, watchedPrompt, setValue, trigger]);

  // Debounced Grok preview
  React.useEffect(() => {
    if (watchedPrompt && watchedModel === 'grok-beta' && activeTab === 'preview' && watchedPrompt.length >= 50) {
      generatePreview({
        prompt: watchedPrompt,
        scenario: selectedScenario ? scenarios.find(s => s.id === selectedScenario.id) : undefined,
        model: watchedModel,
        temperature: 0.7
      }, 1500).catch(error => {
        console.error('Preview generation failed:', error);
      });
    }
  }, [watchedPrompt, watchedModel, activeTab, selectedScenario, generatePreview, scenarios]);

  // Handle scenario selection
  const handleScenarioChange = useCallback(async (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setSelectedScenario({ id: scenario.id, name: scenario.name });
      
      if (watchedPrompt && watchedModel === 'grok-beta') {
        try {
          await generatePreviewWithScenario(watchedPrompt, scenarioId, {
            model: watchedModel,
            temperature: 0.7
          });
        } catch (error) {
          console.error('Scenario preview failed:', error);
        }
      }
    }
  }, [watchedPrompt, watchedModel, scenarios, generatePreviewWithScenario]);

  // Manual preview generation
  const handleManualPreview = useCallback(async () => {
    if (!watchedPrompt || watchedPrompt.length < 50) {
      return;
    }

    try {
      await generatePreview({
        prompt: watchedPrompt,
        scenario: selectedScenario ? scenarios.find(s => s.id === selectedScenario.id) : undefined,
        model: watchedModel,
        temperature: 0.7,
        useCache: false // Force fresh preview
      }, 0); // No debounce for manual generation
    } catch (error) {
      console.error('Manual preview failed:', error);
    }
  }, [watchedPrompt, watchedModel, selectedScenario, scenarios, generatePreview]);

  // Add user-defined call
  const addUserDefinedCall = useCallback(() => {
    const currentCalls = watchedUserDefinedCalls || [];
    const newCall = {
      id: `call_${Date.now()}`,
      name: '',
      description: '',
      prompt: ''
    };
    setValue('userDefinedCalls', [...currentCalls, newCall]);
  }, [watchedUserDefinedCalls, setValue]);

  // Remove user-defined call
  const removeUserDefinedCall = useCallback((index: number) => {
    const currentCalls = watchedUserDefinedCalls || [];
    setValue('userDefinedCalls', currentCalls.filter((_, i) => i !== index));
  }, [watchedUserDefinedCalls, setValue]);

  // Copy example prompt
  const copyExamplePrompt = useCallback((category: keyof typeof PROMPT_EXAMPLES) => {
    setValue('prompt', PROMPT_EXAMPLES[category]);
    setValue('category', category);
    trigger(['prompt', 'category']);
  }, [setValue, trigger]);

  // Handle form submission
  const onSubmit = useCallback(async (data: AgentBuilderForm) => {
    if (!organizationId || !userId) {
      setDeploymentStatus('error');
      setDeploymentMessage('Organization ID and User ID are required');
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus('idle');

    try {
      // Create agent in Convex
      const agentId = await createAgent({
        organizationId,
        userId,
        name: data.name,
        description: data.description,
        category: data.category,
        type: 'custom',
        config: {
          prompt: data.prompt,
          model: data.model,
          temperature: 0.7,
          maxTokens: 2000,
          dataSource: ['transactions', 'accounts'],
        },
        userDefinedCalls: data.userDefinedCalls,
        version: data.version
      });

      setDeploymentStatus('success');
      setDeploymentMessage(`Agent "${data.name}" deployed successfully!`);
      
      // Reset form
      reset();
      
      // Callback for parent component
      if (onAgentCreated) {
        onAgentCreated(agentId);
      }

    } catch (error) {
      console.error('Agent deployment failed:', error);
      setDeploymentStatus('error');
      setDeploymentMessage(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  }, [organizationId, userId, createAgent, onAgentCreated, reset]);

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Agent Builder</h2>
              <p className="text-sm text-gray-600">Create and deploy your custom FinHelm AI agent</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {deploymentStatus === 'success' && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Deployed</span>
              </div>
            )}
            {deploymentStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <button
            onClick={() => setActiveTab('builder')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'builder'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Builder</span>
          </button>
          
          <button
            onClick={() => setActiveTab('preview')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'preview'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            disabled={watchedModel !== 'grok-beta'}
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('versions')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'versions'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <History className="h-4 w-4" />
            <span>Versions</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'builder' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agent Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="e.g., Financial Insights Agent"
                  className={clsx(
                    'input',
                    errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Version */}
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
                  Version *
                </label>
                <input
                  {...register('version')}
                  type="text"
                  placeholder="1.0.0"
                  className={clsx(
                    'input',
                    errors.version ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                />
                {errors.version && (
                  <p className="mt-1 text-sm text-red-600">{errors.version.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Describe what this agent does and its key capabilities..."
                className={clsx(
                  'input resize-none',
                  errors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Model */}
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model *
                </label>
                <select
                  {...register('model')}
                  className={clsx(
                    'input',
                    errors.model ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                >
                  {MODEL_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                {errors.model && (
                  <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
                )}
              </div>

              {/* Language */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Language *
                </label>
                <select
                  {...register('language')}
                  className={clsx(
                    'input',
                    errors.language ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                >
                  {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.flag} {option.label}
                    </option>
                  ))}
                </select>
                {errors.language && (
                  <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category')}
                  className={clsx(
                    'input',
                    errors.category ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                >
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                  Agent Prompt *
                </label>
                <div className="flex space-x-2">
                  {Object.entries(CATEGORY_OPTIONS).map(([_, option]) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => copyExamplePrompt(option.value as keyof typeof PROMPT_EXAMPLES)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      title={`Copy ${option.label} example`}
                    >
                      <Copy className="h-3 w-3" />
                      <span>{option.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <textarea
                  {...register('prompt')}
                  rows={12}
                  placeholder="Define your agent's behavior, capabilities, and response style. Be specific about what data to analyze and what insights to provide..."
                  className={clsx(
                    'input resize-none font-mono text-sm',
                    errors.prompt ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  )}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  {watchedPrompt?.length || 0}/2000
                </div>
              </div>
              {errors.prompt && (
                <p className="mt-1 text-sm text-red-600">{errors.prompt.message}</p>
              )}
            </div>

            {/* User-Defined Calls */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">User-Defined Calls</h3>
                  <p className="text-xs text-gray-600">Define custom commands like "Rewrite expense report"</p>
                </div>
                <button
                  type="button"
                  onClick={addUserDefinedCall}
                  className="btn-secondary flex items-center space-x-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Call</span>
                </button>
              </div>

              <div className="space-y-4">
                {(watchedUserDefinedCalls || []).map((call, index) => (
                  <div key={call.id} className="card border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Call #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeUserDefinedCall(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Call Name
                        </label>
                        <input
                          {...register(`userDefinedCalls.${index}.name`)}
                          type="text"
                          placeholder="e.g., Rewrite expense report"
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          {...register(`userDefinedCalls.${index}.description`)}
                          type="text"
                          placeholder="e.g., Rewrites expense report with better formatting"
                          className="input text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Prompt Template
                      </label>
                      <textarea
                        {...register(`userDefinedCalls.${index}.prompt`)}
                        rows={3}
                        placeholder="Define how the agent should handle this specific call..."
                        className="input text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Status */}
            {deploymentMessage && (
              <div className={clsx(
                'rounded-lg p-4 flex items-center space-x-2',
                deploymentStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              )}>
                {deploymentStatus === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={clsx(
                  'text-sm',
                  deploymentStatus === 'success' ? 'text-green-800' : 'text-red-800'
                )}>
                  {deploymentMessage}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {!isValid && isDirty && (
                  <span className="text-red-600">Please fix validation errors before deploying</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="btn-secondary"
                  disabled={isDeploying}
                >
                  Reset
                </button>
                
                <button
                  type="submit"
                  disabled={!isValid || isDeploying}
                  className={clsx(
                    'btn-primary flex items-center space-x-2',
                    (!isValid || isDeploying) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isDeploying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{isDeploying ? 'Deploying...' : 'Deploy Agent'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            {/* Model Compatibility Notice */}
            {watchedModel !== 'grok-beta' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Grok Preview Mode</h3>
                    <p className="text-sm text-yellow-700">
                      Preview is only available when using Grok Beta model. Switch to Grok Beta to see real-time preview of your agent responses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {watchedModel === 'grok-beta' && (
              <>
                {/* Scenario Selection */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Test Scenarios</h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Database className="h-3 w-3" />
                      <span>{scenarios.length} scenarios available</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedScenario(null)}
                      className={clsx(
                        'p-3 rounded-lg border text-left transition-colors',
                        !selectedScenario 
                          ? 'border-blue-300 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="font-medium text-sm">General Preview</div>
                      <div className="text-xs text-gray-600 mt-1">Test with hypothetical data</div>
                    </button>
                    
                    {scenarios.map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => handleScenarioChange(scenario.id)}
                        className={clsx(
                          'p-3 rounded-lg border text-left transition-colors',
                          selectedScenario?.id === scenario.id
                            ? 'border-blue-300 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div className="font-medium text-sm">{scenario.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">Agent Preview</h3>
                      {isDebouncing && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600">
                          <Clock className="h-3 w-3 animate-pulse" />
                          <span>Updating...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Cache Stats */}
                      <div className="text-xs text-gray-500 mr-2">
                        {getCacheStats().validEntries} cached
                      </div>
                      
                      {/* Manual Preview Button */}
                      <button
                        onClick={handleManualPreview}
                        disabled={previewLoading || !watchedPrompt || watchedPrompt.length < 50}
                        className="btn-secondary flex items-center space-x-2 text-sm"
                      >
                        {previewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span>{previewLoading ? 'Generating...' : 'Refresh Preview'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Scenario Info */}
                  {selectedScenario && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Testing with: {selectedScenario.name}</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        {scenarios.find(s => s.id === selectedScenario.id)?.description}
                      </p>
                    </div>
                  )}

                  {/* Preview Content */}
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
                    {previewLoading && (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-1">Generating preview with Grok...</p>
                          <p className="text-xs text-gray-500">
                            {selectedScenario ? `Using ${selectedScenario.name} scenario` : 'Using general scenario'}
                          </p>
                        </div>
                      </div>
                    )}

                    {previewError && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Preview Error</span>
                        </div>
                        <p>{previewError}</p>
                      </div>
                    )}

                    {preview && !previewLoading && (
                      <div className="space-y-4">
                        {/* Preview Metadata */}
                        <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-200 pb-2">
                          <div className="flex items-center space-x-4">
                            <span>Generated: {new Date(preview.timestamp).toLocaleTimeString()}</span>
                            {preview.tokensUsed && <span>Tokens: {preview.tokensUsed}</span>}
                            {preview.executionTime && <span>Time: {preview.executionTime}ms</span>}
                          </div>
                          <button
                            onClick={clearPreview}
                            className="text-gray-400 hover:text-gray-600"
                            title="Clear preview"
                          >
                            ×
                          </button>
                        </div>
                        
                        {/* Preview Content */}
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                            {preview.content}
                          </div>
                        </div>
                      </div>
                    )}

                    {!previewLoading && !preview && !previewError && (
                      <div className="text-center py-12 text-gray-500">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <div className="space-y-2">
                          <p className="font-medium">Ready to preview your agent</p>
                          <p className="text-sm">
                            {watchedPrompt && watchedPrompt.length >= 50 
                              ? 'Preview will generate automatically as you type'
                              : 'Add at least 50 characters to your prompt to enable preview'
                            }
                          </p>
                          {selectedScenario && (
                            <p className="text-xs text-blue-600">
                              Will test with {selectedScenario.name} scenario
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionManager 
            organizationId={organizationId}
            userId={userId}
            agentName={watchedValues.name}
            currentVersion={watchedValues.version}
            onVersionSelect={(version) => {
              // Load version data into form
              reset({
                ...watchedValues,
                version: version.version,
                prompt: version.config.prompt,
                model: version.config.model,
                userDefinedCalls: version.config.userDefinedCalls || []
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

export default CustomBuilderUI;