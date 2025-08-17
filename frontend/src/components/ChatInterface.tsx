import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import { 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { api } from '../services/api';
import AgentSelector from './AgentSelector';
import ChartDisplay from './ChartDisplay';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
  charts?: any[];
  insights?: any;
  recommendations?: string[];
  loading?: boolean;
  error?: string;
}

interface ChatSession {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  messages: Message[];
}

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionChange?: (session: ChatSession) => void;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  onSessionChange,
  className
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('finance');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history
  const { data: chatHistory } = useQuery({
    queryKey: ['chat-history', sessionId],
    queryFn: () => sessionId ? api.getChatHistory(sessionId) : null,
    enabled: !!sessionId,
    onSuccess: (data) => {
      if (data?.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.message_type,
          content: msg.content,
          timestamp: msg.created_at,
          charts: msg.metadata?.charts || [],
          insights: msg.metadata?.insights || {},
          recommendations: msg.metadata?.recommendations || []
        }));
        setMessages(formattedMessages);
      }
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; agent_type?: string }) => {
      return api.sendChatMessage({
        message: messageData.message,
        agent_type: messageData.agent_type || selectedAgent,
        session_id: sessionId
      });
    },
    onSuccess: (response) => {
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.loading));
      
      // Add assistant response
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        agent: selectedAgent,
        charts: response.charts || [],
        insights: response.financial_insights || {},
        recommendations: response.recommendations || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(false);
      
      // Update session if callback provided
      if (onSessionChange && response.session_id) {
        onSessionChange({
          id: response.session_id,
          session_id: response.session_id,
          title: currentMessage.substring(0, 50),
          created_at: new Date().toISOString(),
          messages: [...messages, assistantMessage]
        });
      }
    },
    onError: (error: any) => {
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.loading));
      
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsStreaming(false);
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || sendMessageMutation.isLoading) return;

    const messageText = currentMessage.trim();
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    // Add loading message
    const loadingMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: 'Analyzing your request...',
      timestamp: new Date().toISOString(),
      loading: true,
      agent: selectedAgent
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setCurrentMessage('');
    setIsStreaming(true);

    // Send message
    sendMessageMutation.mutate({ message: messageText, agent_type: selectedAgent });
  };

  // Keyboard shortcuts
  useHotkeys('enter', (e) => {
    if (!e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, { enableOnFormTags: ['textarea'] });

  useHotkeys('cmd+enter', handleSendMessage, { enableOnFormTags: ['textarea'] });

  return (
    <div className={classNames('flex flex-col h-full bg-gray-50', className)}>
      {/* Agent Selector */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          disabled={isStreaming}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to ERPInsight.ai
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Ask me anything about your QuickBooks data. I can help with financial analysis, 
                sales insights, and operational optimization.
              </p>
            </motion.div>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <MessageBubble message={message} />
                
                {/* Charts Display */}
                {message.charts && message.charts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 0.2 }}
                    className="mt-4"
                  >
                    <ChartDisplay charts={message.charts} />
                  </motion.div>
                )}

                {/* Insights Display */}
                {message.insights && Object.keys(message.insights).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Key Insights
                    </h4>
                    <div className="text-sm text-blue-800">
                      {message.insights.key_insights?.map((insight: string, idx: number) => (
                        <div key={idx} className="mb-1">• {insight}</div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Recommendations Display */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <h4 className="font-medium text-green-900 mb-2 flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                      Recommendations
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      {message.recommendations.map((rec: string, idx: number) => (
                        <div key={idx} className="flex items-start">
                          <span className="text-green-600 mr-2">→</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isStreaming && <TypingIndicator agent={selectedAgent} />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <TextareaAutosize
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder={`Ask the ${selectedAgent} agent anything...`}
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              minRows={1}
              maxRows={4}
              disabled={isStreaming}
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <div>
                Press Enter to send • Shift+Enter for new line
              </div>
              <div className="flex items-center space-x-2">
                {isStreaming && (
                  <span className="flex items-center">
                    <ArrowPathIcon className="w-3 h-3 animate-spin mr-1" />
                    Processing...
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isStreaming}
            className={classNames(
              'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
              currentMessage.trim() && !isStreaming
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {isStreaming ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;