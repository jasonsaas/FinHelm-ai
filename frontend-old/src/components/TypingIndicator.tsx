import React from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';

interface TypingIndicatorProps {
  agent?: string;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  agent = 'finance', 
  className 
}) => {
  const getAgentIcon = (agentId: string) => {
    const icons: Record<string, string> = {
      finance: '💰',
      sales: '📈',
      operations: '⚙️'
    };
    return icons[agentId] || '🤖';
  };

  const getAgentColor = (agentId: string) => {
    const colors: Record<string, string> = {
      finance: 'bg-green-100 text-green-700',
      sales: 'bg-blue-100 text-blue-700',
      operations: 'bg-orange-100 text-orange-700'
    };
    return colors[agentId] || 'bg-gray-100 text-gray-700';
  };

  const getAgentName = (agentId: string) => {
    const names: Record<string, string> = {
      finance: 'Finance Agent',
      sales: 'Sales Agent',
      operations: 'Operations Agent'
    };
    return names[agentId] || 'AI Assistant';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={classNames('flex w-full justify-start', className)}
    >
      <div className="flex max-w-4xl">
        {/* Avatar */}
        <div className="flex-shrink-0 mr-3">
          <div className={classNames(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm',
            getAgentColor(agent)
          )}>
            {getAgentIcon(agent)}
          </div>
        </div>

        {/* Typing Content */}
        <div className="flex-1 min-w-0">
          {/* Agent Name */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {getAgentName(agent)}
            </span>
            <span className="text-xs text-gray-500">is analyzing...</span>
          </div>

          {/* Typing Bubble */}
          <div className="inline-block bg-gray-100 px-4 py-3 rounded-2xl">
            <div className="flex items-center space-x-1">
              {/* Animated dots */}
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0 
                }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.2 
                }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.4 
                }}
              />
              
              {/* Status text */}
              <span className="ml-3 text-sm text-gray-600">
                Processing your request...
              </span>
            </div>
          </div>

          {/* Processing steps indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-2 text-xs text-gray-500"
          >
            <div className="flex items-center space-x-4">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center"
              >
                <div className="w-1 h-1 bg-blue-400 rounded-full mr-1" />
                Fetching data
              </motion.span>
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className="flex items-center"
              >
                <div className="w-1 h-1 bg-green-400 rounded-full mr-1" />
                Analyzing patterns
              </motion.span>
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                className="flex items-center"
              >
                <div className="w-1 h-1 bg-purple-400 rounded-full mr-1" />
                Generating insights
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;