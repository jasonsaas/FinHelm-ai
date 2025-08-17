import React, { useState } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: string;
  color?: string;
}

interface AgentSelectorProps {
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
  disabled?: boolean;
  className?: string;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgent,
  onAgentChange,
  disabled = false,
  className
}) => {
  const [showCapabilities, setShowCapabilities] = useState(false);

  // Fetch available agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAvailableAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const agents: Agent[] = agentsData?.agents || [
    {
      id: 'finance',
      name: 'Finance Agent',
      description: 'Financial analysis, cash flow, and forecasting',
      capabilities: [
        'Cash flow analysis',
        'Profit & loss insights', 
        'Budget variance explanations',
        'Financial forecasting',
        'KPI monitoring'
      ],
      icon: '💰',
      color: '#2E7D32'
    },
    {
      id: 'sales',
      name: 'Sales Agent', 
      description: 'Sales performance and customer insights',
      capabilities: [
        'Sales trend analysis',
        'Customer segmentation',
        'Revenue forecasting', 
        'Performance metrics',
        'Growth strategies'
      ],
      icon: '📈',
      color: '#1976D2'
    },
    {
      id: 'operations',
      name: 'Operations Agent',
      description: 'Operational efficiency and cost optimization', 
      capabilities: [
        'Expense analysis',
        'Inventory optimization',
        'Vendor performance',
        'Process efficiency',
        'Cost reduction'
      ],
      icon: '⚙️',
      color: '#F57C00'
    }
  ];

  const currentAgent = agents.find(agent => agent.id === selectedAgent) || agents[0];

  return (
    <div className={classNames('space-y-4', className)}>
      {/* Agent Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgent;
          
          return (
            <motion.button
              key={agent.id}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              onClick={() => !disabled && onAgentChange(agent.id)}
              disabled={disabled}
              className={classNames(
                'relative flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="mr-2 text-lg">{agent.icon}</span>
              <span>{agent.name}</span>
              
              {isSelected && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Agent Info */}
      <motion.div
        key={currentAgent.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: `${currentAgent.color}20` }}
            >
              {currentAgent.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentAgent.name}</h3>
              <p className="text-sm text-gray-600">{currentAgent.description}</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {showCapabilities ? 'Hide' : 'Show'} capabilities
          </button>
        </div>

        {/* Capabilities */}
        <motion.div
          initial={false}
          animate={{ height: showCapabilities ? 'auto' : 0, opacity: showCapabilities ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentAgent.capabilities.map((capability, index) => (
                <motion.div
                  key={capability}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center text-sm text-gray-700"
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: currentAgent.color }}
                  />
                  {capability}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Examples */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Try asking:</h4>
        <div className="space-y-1">
          {getExampleQuestions(currentAgent.id).map((question, index) => (
            <button
              key={index}
              onClick={() => !disabled && onAgentChange(currentAgent.id)}
              className={classNames(
                'text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-white px-2 py-1 rounded transition-colors w-full',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              "'{question}'"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const getExampleQuestions = (agentId: string): string[] => {
  const examples: Record<string, string[]> = {
    finance: [
      'What is my current cash flow status?',
      'Show me my profit and loss trends',
      'What are my biggest expenses this month?'
    ],
    sales: [
      'Who are my top customers by revenue?',
      'What is my monthly sales growth rate?',
      'Which products are performing best?'
    ],
    operations: [
      'What are my biggest expense categories?',
      'Which vendors am I spending the most with?',
      'Do I have any inventory concerns?'
    ]
  };

  return examples[agentId] || [];
};

export default AgentSelector;