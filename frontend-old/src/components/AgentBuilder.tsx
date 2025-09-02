import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import classNames from 'classnames';
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  CogIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Tool {
  name: string;
  description: string;
  enabled: boolean;
}

interface CustomAgent {
  id?: string;
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
  color: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

interface AgentBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: CustomAgent | null;
  onSave?: (agent: CustomAgent) => void;
  className?: string;
}

const availableTools: Tool[] = [
  {
    name: 'quickbooks_query',
    description: 'Query QuickBooks data including transactions, accounts, customers, and inventory',
    enabled: true,
  },
  {
    name: 'financial_analysis',
    description: 'Perform financial calculations, ratios, and trend analysis',
    enabled: false,
  },
  {
    name: 'data_visualization',
    description: 'Generate charts and graphs from business data',
    enabled: false,
  },
  {
    name: 'forecasting',
    description: 'Create predictions and forecasts based on historical data',
    enabled: false,
  },
  {
    name: 'expense_categorization',
    description: 'Automatically categorize and analyze expenses',
    enabled: false,
  },
  {
    name: 'customer_analysis',
    description: 'Analyze customer behavior, segmentation, and lifetime value',
    enabled: false,
  },
  {
    name: 'inventory_optimization',
    description: 'Optimize inventory levels and identify stock issues',
    enabled: false,
  },
];

const agentColors = [
  'blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal', 'red'
];

const agentIcons = [
  'SparklesIcon', 'CogIcon', 'ChartBarIcon', 'CurrencyDollarIcon', 
  'UserIcon', 'BuildingOfficeIcon', 'LightBulbIcon', 'RocketLaunchIcon'
];

const examplePrompts = {
  finance: "You are a Financial Analysis AI Agent. Your role is to analyze financial data, identify trends, and provide actionable insights about cash flow, profitability, and financial health. Always provide specific numbers and recommendations.",
  sales: "You are a Sales Intelligence AI Agent. Your role is to analyze sales data, customer behavior, and revenue patterns. Help identify opportunities for growth, customer retention strategies, and sales optimization.",
  operations: "You are an Operations Optimization AI Agent. Your role is to analyze operational data, identify inefficiencies, and suggest improvements for cost reduction, process optimization, and vendor management.",
  custom: "You are a specialized AI agent. Define your specific role, capabilities, and approach to analyzing business data. Be specific about what types of insights you provide and how you help users make decisions."
};

const AgentBuilder: React.FC<AgentBuilderProps> = ({
  isOpen,
  onClose,
  agent = null,
  onSave,
  className
}) => {
  const [formData, setFormData] = useState<CustomAgent>({
    name: '',
    description: '',
    prompt: '',
    tools: availableTools.map(tool => ({ ...tool })),
    color: 'blue',
    icon: 'SparklesIcon',
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'prompt' | 'tools' | 'preview'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Initialize form data when agent prop changes
  useEffect(() => {
    if (agent) {
      setFormData({
        ...agent,
        tools: availableTools.map(tool => ({
          ...tool,
          enabled: agent.tools?.some(t => t.name === tool.name && t.enabled) || false
        }))
      });
    } else {
      setFormData({
        name: '',
        description: '',
        prompt: examplePrompts.custom,
        tools: availableTools.map(tool => ({ ...tool })),
        color: 'blue',
        icon: 'SparklesIcon',
      });
    }
  }, [agent]);

  const saveAgentMutation = useMutation({
    mutationFn: async (agentData: CustomAgent) => {
      const response = await fetch('/api/agents/custom', {
        method: agent ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...agentData,
          id: agent?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save agent');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-agents'] });
      toast.success(`Agent ${agent ? 'updated' : 'created'} successfully!`);
      onSave?.(data);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save agent');
    },
  });

  const testAgentMutation = useMutation({
    mutationFn: async (testPrompt: string) => {
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          agent: formData,
          query: testPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test agent');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Agent test completed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Agent test failed');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agent name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = 'System prompt is required';
    } else if (formData.prompt.length < 50) {
      newErrors.prompt = 'System prompt must be at least 50 characters';
    }

    const enabledTools = formData.tools.filter(tool => tool.enabled);
    if (enabledTools.length === 0) {
      newErrors.tools = 'At least one tool must be enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      saveAgentMutation.mutate(formData);
    }
  };

  const handleTestAgent = () => {
    if (validateForm()) {
      const testPrompt = "Give me a brief overview of my business performance.";
      testAgentMutation.mutate(testPrompt);
    }
  };

  const handlePromptTemplate = (type: keyof typeof examplePrompts) => {
    setFormData(prev => ({
      ...prev,
      prompt: examplePrompts[type]
    }));
  };

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-100`,
    border: `border-${color}-300`,
    text: `text-${color}-800`,
    button: `bg-${color}-600 hover:bg-${color}-700`,
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={classNames(
            'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden',
            className
          )}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={classNames(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  getColorClasses(formData.color).bg
                )}>
                  <SparklesIcon className={classNames('w-6 h-6', getColorClasses(formData.color).text)} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {agent ? 'Edit Agent' : 'Create Custom Agent'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Build an AI agent tailored to your specific business needs
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mt-4">
              {[
                { id: 'basic', label: 'Basic Info', icon: InformationCircleIcon },
                { id: 'prompt', label: 'AI Prompt', icon: PencilIcon },
                { id: 'tools', label: 'Tools', icon: CogIcon },
                { id: 'preview', label: 'Preview', icon: PlayIcon },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={classNames(
                    'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={classNames(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    )}
                    placeholder="e.g., Customer Retention Specialist"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={classNames(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    )}
                    placeholder="Describe what this agent does and how it helps your business"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Color and Icon */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Theme
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {agentColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                          className={classNames(
                            `w-8 h-8 rounded-lg bg-${color}-500`,
                            formData.color === color && 'ring-2 ring-gray-400 ring-offset-2'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {agentIcons.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* AI Prompt Tab */}
            {activeTab === 'prompt' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      System Prompt
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePromptTemplate('finance')}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Finance Template
                      </button>
                      <button
                        onClick={() => handlePromptTemplate('sales')}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Sales Template
                      </button>
                      <button
                        onClick={() => handlePromptTemplate('operations')}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Operations Template
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    rows={8}
                    className={classNames(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm',
                      errors.prompt ? 'border-red-300' : 'border-gray-300'
                    )}
                    placeholder="Define your agent's personality, capabilities, and approach..."
                  />
                  {errors.prompt && (
                    <p className="mt-1 text-sm text-red-600">{errors.prompt}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Character count: {formData.prompt.length} (minimum 50 characters)
                  </p>
                </div>
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Available Tools</h3>
                  <span className="text-sm text-gray-500">
                    {formData.tools.filter(tool => tool.enabled).length} of {formData.tools.length} enabled
                  </span>
                </div>
                
                {errors.tools && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                      <p className="ml-2 text-sm text-red-600">{errors.tools}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {formData.tools.map((tool, index) => (
                    <div
                      key={tool.name}
                      className={classNames(
                        'border rounded-lg p-4 transition-all',
                        tool.enabled
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={tool.enabled}
                            onChange={(e) => {
                              const newTools = [...formData.tools];
                              newTools[index].enabled = e.target.checked;
                              setFormData(prev => ({ ...prev, tools: newTools }));
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                          </div>
                        </div>
                        {tool.enabled && (
                          <CheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                {/* Agent Preview Card */}
                <div className={classNames(
                  'border-2 rounded-lg p-6',
                  getColorClasses(formData.color).border,
                  getColorClasses(formData.color).bg
                )}>
                  <div className="flex items-start space-x-4">
                    <div className={classNames(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      `bg-${formData.color}-600`
                    )}>
                      <SparklesIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={classNames('text-lg font-semibold', getColorClasses(formData.color).text)}>
                        {formData.name || 'Unnamed Agent'}
                      </h3>
                      <p className="text-gray-700 mt-1">
                        {formData.description || 'No description provided'}
                      </p>
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Enabled Tools:</p>
                        <div className="flex flex-wrap gap-1">
                          {formData.tools.filter(tool => tool.enabled).map(tool => (
                            <span
                              key={tool.name}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300"
                            >
                              {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Agent */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Test Your Agent</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Test how your agent responds to a sample query to ensure it's working correctly.
                  </p>
                  <button
                    onClick={handleTestAgent}
                    disabled={testAgentMutation.isLoading || !validateForm()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    <span>
                      {testAgentMutation.isLoading ? 'Testing...' : 'Test Agent'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {Object.keys(errors).length > 0 && (
                <span className="text-red-600">Please fix the errors above before saving</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveAgentMutation.isLoading || Object.keys(errors).length > 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {saveAgentMutation.isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
                <span>
                  {saveAgentMutation.isLoading ? 'Saving...' : (agent ? 'Update Agent' : 'Create Agent')}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentBuilder;