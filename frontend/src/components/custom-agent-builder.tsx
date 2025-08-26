import React, { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
// import { api } from '../../convex/_generated/api';

interface AgentConfig {
  name: string;
  type: 'variance_explanation' | 'cash_flow_intelligence' | 'anomaly_monitoring' | 'close_acceleration' | 
        'forecasting' | 'multivariate_prediction' | 'working_capital_optimization' | 'budget_variance_tracker' |
        'expense_categorization' | 'revenue_recognition_assistant' | 'custom';
  description: string;
  settings: {
    confidenceThreshold: number;
    analysisType: string;
    grokEnabled: boolean;
    oracleIntegration: boolean;
    fuzzyMatchingEnabled: boolean;
    batchSize: number;
    testMode: boolean;
  };
  erpDataSources: {
    enabled: boolean;
    sources: Array<{
      type: 'quickbooks' | 'sage_intacct' | 'netsuite' | 'xero';
      enabled: boolean;
      filters: {
        accounts: string[];
        departments: string[];
        locations: string[];
        dateRange: {
          start: string;
          end: string;
        };
        transactionTypes: string[];
      };
      syncSettings: {
        frequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
        autoReconcile: boolean;
        fuzzyMatchThreshold: number;
      };
    }>;
    ragSettings: {
      enabled: boolean;
      historicalLookback: number; // days
      contextWindow: number; // number of similar queries
      confidenceBoost: number; // percentage boost for grounded data
    };
  };
  schedule?: {
    enabled: boolean;
    interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
  };
  notifications: {
    email: boolean;
    webhook?: string;
    threshold: number;
  };
}

interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'deployed' | 'failed';
  message?: string;
  deployedAt?: Date;
  version?: string;
}

const CustomAgentBuilder: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    type: 'variance_explanation',
    description: '',
    settings: {
      confidenceThreshold: 92.7,
      analysisType: 'comprehensive',
      grokEnabled: true,
      oracleIntegration: false,
      fuzzyMatchingEnabled: false,
      batchSize: 1000,
      testMode: true,
    },
    erpDataSources: {
      enabled: true,
      sources: [
        {
          type: 'quickbooks',
          enabled: true,
          filters: {
            accounts: [],
            departments: [],
            locations: [],
            dateRange: {
              start: '',
              end: '',
            },
            transactionTypes: ['invoice', 'bill', 'payment'],
          },
          syncSettings: {
            frequency: 'daily',
            autoReconcile: true,
            fuzzyMatchThreshold: 0.9,
          },
        },
        {
          type: 'sage_intacct',
          enabled: false,
          filters: {
            accounts: [],
            departments: [],
            locations: [],
            dateRange: {
              start: '',
              end: '',
            },
            transactionTypes: ['journal_entry', 'bill', 'invoice'],
          },
          syncSettings: {
            frequency: 'daily',
            autoReconcile: true,
            fuzzyMatchThreshold: 0.9,
          },
        },
      ],
      ragSettings: {
        enabled: true,
        historicalLookback: 90,
        contextWindow: 5,
        confidenceBoost: 15,
      },
    },
    schedule: {
      enabled: false,
      interval: 'daily',
    },
    notifications: {
      email: true,
      threshold: 85.0,
    },
  });

  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    status: 'idle',
  });

  const [grokPreview, setGrokPreview] = useState<{
    loading: boolean;
    result?: any;
    error?: string;
  }>({
    loading: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Mock functions for now - will be replaced with actual Convex mutations
  const deployAgent = useMutation(() => Promise.resolve({ agentId: 'test', version: '1.0.0' }));
  const previewGrokAnalysis = useMutation(() => Promise.resolve({ 
    summary: 'Preview analysis completed',
    confidence: 95,
    patterns: [],
    explainableAnalysis: { reasoning: 'Test reasoning', factors: [], traceabilityScore: 95 }
  }));
  const validateConfiguration = useMutation(() => Promise.resolve({ valid: true }));

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!config.name.trim()) {
      errors.name = 'Agent name is required';
    } else if (config.name.length < 3) {
      errors.name = 'Agent name must be at least 3 characters';
    }

    if (!config.description.trim()) {
      errors.description = 'Description is required';
    } else if (config.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (config.settings.confidenceThreshold < 0 || config.settings.confidenceThreshold > 100) {
      errors.confidenceThreshold = 'Confidence threshold must be between 0 and 100';
    }

    if (config.notifications.threshold < 0 || config.notifications.threshold > 100) {
      errors.notificationThreshold = 'Notification threshold must be between 0 and 100';
    }

    if (config.notifications.webhook && !isValidUrl(config.notifications.webhook)) {
      errors.webhook = 'Invalid webhook URL';
    }

    setValidationErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [config]);

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  React.useEffect(() => {
    validateForm();
  }, [validateForm]);

  const handleInputChange = (field: string, value: any) => {
    setConfig(prev => {
      const keys = field.split('.');
      const newConfig = { ...prev };
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleGrokPreview = async () => {
    if (!config.settings.grokEnabled) return;
    
    setGrokPreview({ loading: true });
    
    try {
      const result = await previewGrokAnalysis({
        agentType: config.type,
        sampleData: getSampleDataForType(config.type),
        confidenceThreshold: config.settings.confidenceThreshold,
      });
      
      setGrokPreview({
        loading: false,
        result,
      });
    } catch (error) {
      setGrokPreview({
        loading: false,
        error: error instanceof Error ? error.message : 'Preview failed',
      });
    }
  };

  const getSampleDataForType = (type: string) => {
    switch (type) {
      case 'variance_explanation':
        return {
          transactions: [
            { id: '1', amount: 45000, type: 'invoice', date: new Date().toISOString() },
            { id: '2', amount: 25000, type: 'bill', date: new Date().toISOString() },
          ],
          accounts: [{ id: '1', name: 'Revenue', type: 'revenue' }],
        };
      case 'cash_flow_intelligence':
        return {
          transactions: [
            { id: '1', amount: 15000, type: 'payment', date: new Date().toISOString() },
            { id: '2', amount: -8000, type: 'bill', date: new Date().toISOString() },
          ],
          forecast: { weeks: 13 },
        };
      case 'anomaly_monitoring':
        return {
          transactions: [
            { id: '1', amount: 10000, category: 'expense', date: new Date().toISOString() },
            { id: '2', amount: 50, category: 'expense', date: new Date().toISOString() },
          ],
        };
      case 'forecasting':
        return {
          transactions: [
            { id: '1', amount: 50000, type: 'revenue', date: new Date().toISOString() },
          ],
          externalFactors: ['seasonal', 'economic'],
        };
      case 'multivariate_prediction':
        return {
          transactions: [{ id: '1', amount: 75000, type: 'revenue', date: new Date().toISOString() }],
          externalData: { marketTrends: 'positive', economicIndicators: 'stable' },
        };
      default:
        return {
          transactions: [{ id: '1', amount: 1000, type: 'general', date: new Date().toISOString() }],
        };
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      return;
    }

    setDeploymentStatus({ status: 'deploying', message: 'Validating configuration...' });

    try {
      // Validate configuration with backend
      await validateConfiguration(config);
      
      setDeploymentStatus({ status: 'deploying', message: 'Deploying agent...' });
      
      // Deploy the agent
      const result = await deployAgent(config);
      
      setDeploymentStatus({
        status: 'deployed',
        message: 'Agent deployed successfully',
        deployedAt: new Date(),
        version: result.version,
      });
    } catch (error) {
      setDeploymentStatus({
        status: 'failed',
        message: error instanceof Error ? error.message : 'Deployment failed',
      });
    }
  };

  const handleTestConfiguration = async () => {
    setDeploymentStatus({ status: 'deploying', message: 'Testing configuration...' });
    
    try {
      const testConfig = { ...config, settings: { ...config.settings, testMode: true } };
      await validateConfiguration(testConfig);
      
      setDeploymentStatus({
        status: 'idle',
        message: 'Configuration test passed',
      });
    } catch (error) {
      setDeploymentStatus({
        status: 'failed',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="custom-agent-builder">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Custom Agent Builder</h1>
      
      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Basic Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700">
                Agent Name *
              </label>
              <input
                id="agent-name"
                type="text"
                value={config.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter agent name"
                data-testid="agent-name-input"
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600" data-testid="agent-name-error">
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="agent-type" className="block text-sm font-medium text-gray-700">
                Agent Type
              </label>
              <select
                id="agent-type"
                value={config.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="agent-type-select"
              >
                <optgroup label="Core MVP Agents">
                  <option value="variance_explanation">1. Automated Variance Explanation</option>
                  <option value="cash_flow_intelligence">2. Cash Flow Intelligence (13-week)</option>
                  <option value="anomaly_monitoring">3. Anomaly Monitoring</option>
                  <option value="close_acceleration">4. Close Acceleration</option>
                  <option value="forecasting">5. Forecasting with ML</option>
                  <option value="multivariate_prediction">6. Multivariate Prediction</option>
                  <option value="working_capital_optimization">7. Working Capital Optimization</option>
                  <option value="budget_variance_tracker">8. Budget Variance Tracker</option>
                  <option value="expense_categorization">9. Expense Categorization</option>
                  <option value="revenue_recognition_assistant">10. Revenue Recognition Assistant</option>
                </optgroup>
                <optgroup label="Custom">
                  <option value="custom">Custom Agent</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              value={config.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                validationErrors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe what this agent will do..."
              data-testid="description-textarea"
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600" data-testid="description-error">
                {validationErrors.description}
              </p>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="confidence-threshold" className="block text-sm font-medium text-gray-700">
                Confidence Threshold (%)
              </label>
              <input
                id="confidence-threshold"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.settings.confidenceThreshold}
                onChange={(e) => handleInputChange('settings.confidenceThreshold', parseFloat(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="confidence-threshold-input"
              />
              {validationErrors.confidenceThreshold && (
                <p className="mt-1 text-sm text-red-600" data-testid="confidence-threshold-error">
                  {validationErrors.confidenceThreshold}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="batch-size" className="block text-sm font-medium text-gray-700">
                Batch Size
              </label>
              <input
                id="batch-size"
                type="number"
                min="1"
                max="10000"
                value={config.settings.batchSize}
                onChange={(e) => handleInputChange('settings.batchSize', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="batch-size-input"
              />
            </div>

            <div>
              <label htmlFor="analysis-type" className="block text-sm font-medium text-gray-700">
                Analysis Type
              </label>
              <select
                id="analysis-type"
                value={config.settings.analysisType}
                onChange={(e) => handleInputChange('settings.analysisType', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="analysis-type-select"
              >
                <option value="basic">Basic</option>
                <option value="comprehensive">Comprehensive</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                id="grok-enabled"
                type="checkbox"
                checked={config.settings.grokEnabled}
                onChange={(e) => handleInputChange('settings.grokEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                data-testid="grok-enabled-checkbox"
              />
              <label htmlFor="grok-enabled" className="ml-2 block text-sm text-gray-900">
                Enable Grok AI Analysis
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="oracle-integration"
                type="checkbox"
                checked={config.settings.oracleIntegration}
                onChange={(e) => handleInputChange('settings.oracleIntegration', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                data-testid="oracle-integration-checkbox"
              />
              <label htmlFor="oracle-integration" className="ml-2 block text-sm text-gray-900">
                Oracle Ledger Integration
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="test-mode"
                type="checkbox"
                checked={config.settings.testMode}
                onChange={(e) => handleInputChange('settings.testMode', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                data-testid="test-mode-checkbox"
              />
              <label htmlFor="test-mode" className="ml-2 block text-sm text-gray-900">
                Test Mode (Sandbox)
              </label>
            </div>
          </div>
        </div>

        {/* ERP Data Sources Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">ERP Data Sources</h2>
            <div className="flex items-center">
              <input
                id="erp-enabled"
                type="checkbox"
                checked={config.erpDataSources.enabled}
                onChange={(e) => handleInputChange('erpDataSources.enabled', e.target.checked)}
                className="h-4 w-4 text-green-600 border-gray-300 rounded"
                data-testid="erp-enabled-checkbox"
              />
              <label htmlFor="erp-enabled" className="ml-2 block text-sm text-gray-900">
                Enable Live ERP Integration
              </label>
            </div>
          </div>
          
          {config.erpDataSources.enabled && (
            <div className="space-y-6">
              {/* ERP Sources */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Connected ERP Systems</h3>
                <div className="space-y-4">
                  {config.erpDataSources.sources.map((source, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${source.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="font-medium capitalize">
                            {source.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={source.enabled}
                            onChange={(e) => {
                              const newSources = [...config.erpDataSources.sources];
                              newSources[index].enabled = e.target.checked;
                              handleInputChange('erpDataSources.sources', newSources);
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Enable</label>
                        </div>
                      </div>
                      
                      {source.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sync Settings */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sync Frequency
                            </label>
                            <select
                              value={source.syncSettings.frequency}
                              onChange={(e) => {
                                const newSources = [...config.erpDataSources.sources];
                                newSources[index].syncSettings.frequency = e.target.value as any;
                                handleInputChange('erpDataSources.sources', newSources);
                              }}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                              <option value="real-time">Real-time</option>
                              <option value="hourly">Hourly</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>

                          {/* Fuzzy Match Threshold */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Fuzzy Match Threshold ({Math.round(source.syncSettings.fuzzyMatchThreshold * 100)}%)
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="1.0"
                              step="0.05"
                              value={source.syncSettings.fuzzyMatchThreshold}
                              onChange={(e) => {
                                const newSources = [...config.erpDataSources.sources];
                                newSources[index].syncSettings.fuzzyMatchThreshold = parseFloat(e.target.value);
                                handleInputChange('erpDataSources.sources', newSources);
                              }}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Conservative (50%)</span>
                              <span>Aggressive (100%)</span>
                            </div>
                          </div>

                          {/* Transaction Types */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transaction Types
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['invoice', 'bill', 'payment', 'journal_entry', 'deposit', 'transfer'].map((txnType) => (
                                <label key={txnType} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={source.filters.transactionTypes.includes(txnType)}
                                    onChange={(e) => {
                                      const newSources = [...config.erpDataSources.sources];
                                      if (e.target.checked) {
                                        newSources[index].filters.transactionTypes.push(txnType);
                                      } else {
                                        newSources[index].filters.transactionTypes = 
                                          newSources[index].filters.transactionTypes.filter(t => t !== txnType);
                                      }
                                      handleInputChange('erpDataSources.sources', newSources);
                                    }}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-1"
                                  />
                                  <span className="text-sm text-gray-700 capitalize">{txnType.replace('_', ' ')}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Auto Reconcile */}
                          <div className="md:col-span-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={source.syncSettings.autoReconcile}
                                onChange={(e) => {
                                  const newSources = [...config.erpDataSources.sources];
                                  newSources[index].syncSettings.autoReconcile = e.target.checked;
                                  handleInputChange('erpDataSources.sources', newSources);
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              <label className="ml-2 text-sm text-gray-900">
                                Auto-reconcile transactions above threshold
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* RAG Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Enhancement Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Historical Lookback (days)
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="365"
                      value={config.erpDataSources.ragSettings.historicalLookback}
                      onChange={(e) => handleInputChange('erpDataSources.ragSettings.historicalLookback', parseInt(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Context Window (queries)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.erpDataSources.ragSettings.contextWindow}
                      onChange={(e) => handleInputChange('erpDataSources.ragSettings.contextWindow', parseInt(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Boost (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={config.erpDataSources.ragSettings.confidenceBoost}
                      onChange={(e) => handleInputChange('erpDataSources.ragSettings.confidenceBoost', parseInt(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.erpDataSources.ragSettings.enabled}
                      onChange={(e) => handleInputChange('erpDataSources.ragSettings.enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-900">
                      Enable RAG (Retrieval-Augmented Generation) for enhanced context
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grok Preview Section */}
        {config.settings.grokEnabled && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Grok AI Preview</h2>
              <button
                type="button"
                onClick={handleGrokPreview}
                disabled={grokPreview.loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                data-testid="grok-preview-button"
              >
                {grokPreview.loading ? 'Generating...' : 'Preview Analysis'}
              </button>
            </div>
            
            {grokPreview.loading && (
              <div className="animate-pulse" data-testid="grok-preview-loading">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            )}
            
            {grokPreview.result && (
              <div className="bg-gray-50 rounded-lg p-4" data-testid="grok-preview-result">
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(grokPreview.result, null, 2)}
                </pre>
              </div>
            )}
            
            {grokPreview.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="grok-preview-error">
                <p className="text-red-800">{grokPreview.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="notification-threshold" className="block text-sm font-medium text-gray-700">
                Notification Threshold (%)
              </label>
              <input
                id="notification-threshold"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.notifications.threshold}
                onChange={(e) => handleInputChange('notifications.threshold', parseFloat(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="notification-threshold-input"
              />
              {validationErrors.notificationThreshold && (
                <p className="mt-1 text-sm text-red-600" data-testid="notification-threshold-error">
                  {validationErrors.notificationThreshold}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700">
                Webhook URL (Optional)
              </label>
              <input
                id="webhook-url"
                type="url"
                value={config.notifications.webhook || ''}
                onChange={(e) => handleInputChange('notifications.webhook', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="https://your-webhook-endpoint.com"
                data-testid="webhook-url-input"
              />
              {validationErrors.webhook && (
                <p className="mt-1 text-sm text-red-600" data-testid="webhook-error">
                  {validationErrors.webhook}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Deployment Status */}
        {deploymentStatus.status !== 'idle' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Deployment Status</h2>
            
            <div className={`p-4 rounded-lg ${
              deploymentStatus.status === 'deployed' ? 'bg-green-50 border border-green-200' :
              deploymentStatus.status === 'failed' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`} data-testid="deployment-status">
              <div className="flex items-center">
                {deploymentStatus.status === 'deploying' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" data-testid="deployment-spinner"></div>
                )}
                <span className={`font-medium ${
                  deploymentStatus.status === 'deployed' ? 'text-green-800' :
                  deploymentStatus.status === 'failed' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {deploymentStatus.message}
                </span>
              </div>
              
              {deploymentStatus.deployedAt && (
                <p className="mt-2 text-sm text-gray-600">
                  Deployed: {deploymentStatus.deployedAt.toLocaleString()}
                  {deploymentStatus.version && ` (v${deploymentStatus.version})`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={handleTestConfiguration}
            disabled={!isFormValid || deploymentStatus.status === 'deploying'}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
            data-testid="test-config-button"
          >
            Test Configuration
          </button>
          
          <button
            type="submit"
            disabled={!isFormValid || deploymentStatus.status === 'deploying'}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="deploy-button"
          >
            {deploymentStatus.status === 'deploying' ? 'Deploying...' : 'Deploy Agent'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomAgentBuilder;