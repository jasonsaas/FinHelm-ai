import React from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { 
  UserIcon, 
  CpuChipIcon,
  ExclamationCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
  loading?: boolean;
  error?: string;
}

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className }) => {
  const isUser = message.role === 'user';
  const isLoading = message.loading;
  const hasError = message.error;

  const getAgentIcon = (agentId?: string) => {
    const icons: Record<string, string> = {
      finance: '💰',
      sales: '📈', 
      operations: '⚙️'
    };
    return icons[agentId || 'finance'] || '🤖';
  };

  const getAgentColor = (agentId?: string) => {
    const colors: Record<string, string> = {
      finance: 'bg-green-100 text-green-700',
      sales: 'bg-blue-100 text-blue-700',
      operations: 'bg-orange-100 text-orange-700'
    };
    return colors[agentId || 'finance'] || 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={classNames(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div className={classNames(
        'flex max-w-4xl',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={classNames(
          'flex-shrink-0',
          isUser ? 'ml-3' : 'mr-3'
        )}>
          <div className={classNames(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm',
            isUser ? 'bg-blue-600 text-white' : getAgentColor(message.agent)
          )}>
            {isUser ? (
              <UserIcon className="w-5 h-5" />
            ) : (
              <span>{getAgentIcon(message.agent)}</span>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={classNames(
          'flex-1 min-w-0',
          isUser ? 'text-right' : 'text-left'
        )}>
          {/* Message Header */}
          {!isUser && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {message.agent ? `${message.agent.charAt(0).toUpperCase() + message.agent.slice(1)} Agent` : 'AI Assistant'}
              </span>
              {isLoading && (
                <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
              )}
              {hasError && (
                <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div className={classNames(
            'inline-block max-w-full px-4 py-3 rounded-2xl',
            isUser 
              ? 'bg-blue-600 text-white'
              : hasError
              ? 'bg-red-50 text-red-900 border border-red-200'
              : isLoading
              ? 'bg-gray-100 text-gray-700 animate-pulse'
              : 'bg-white border border-gray-200 text-gray-900'
          )}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">{message.content}</span>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {isUser ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ReactMarkdown
                    className={classNames(
                      'prose prose-sm max-w-none',
                      hasError ? 'text-red-900' : 'text-gray-900'
                    )}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 last:mb-0 list-disc list-inside">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 last:mb-0 list-decimal list-inside">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => (
                        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm">
                          {children}
                        </pre>
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={classNames(
            'text-xs text-gray-500 mt-1',
            isUser ? 'text-right' : 'text-left'
          )}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </div>

          {/* Error Details */}
          {hasError && message.error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <strong>Error:</strong> {message.error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;