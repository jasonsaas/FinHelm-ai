import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  PaperAirplaneIcon, 
  UserCircleIcon, 
  ComputerDesktopIcon,
  SparklesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CogIcon
} from '@heroicons/react/24/outline';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend);

const ChatInterface = ({ sessionId, onSessionChange, companyName }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('finance');
  const [availableAgents, setAvailableAgents] = useState([]);
  const messagesEndRef = useRef(null);

  const agentIcons = {
    finance: CurrencyDollarIcon,
    sales: ShoppingCartIcon,
    operations: CogIcon
  };

  const agentColors = {
    finance: 'text-green-600 bg-green-50',
    sales: 'text-blue-600 bg-blue-50',
    operations: 'text-purple-600 bg-purple-50'
  };

  useEffect(() => {
    loadAvailableAgents();
    if (sessionId) {
      loadMessages();
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAvailableAgents = async () => {
    try {
      const response = await chatAPI.getAgents();
      setAvailableAgents(response.data.agents);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadMessages = async () => {
    try {
      if (!sessionId) return;
      
      const response = await chatAPI.getMessages(sessionId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      content: inputMessage,
      type: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: messageToSend,
        session_id: sessionId,
        agent_type: selectedAgent
      });

      const aiMessage = {
        id: Date.now() + 1,
        content: response.data.response,
        type: 'assistant',
        timestamp: new Date().toISOString(),
        charts: response.data.charts || [],
        data: response.data.data || {},
        insights: response.data.financial_insights || response.data.insights || {},
        agent_type: selectedAgent
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.data.session_id && response.data.session_id !== sessionId) {
        onSessionChange(response.data.session_id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage = {
        id: Date.now() + 1,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        type: 'assistant',
        timestamp: new Date().toISOString(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = (chart) => {
    const chartProps = {
      data: chart.data,
      options: {
        ...chart.options,
        responsive: true,
        maintainAspectRatio: false
      }
    };

    switch (chart.type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
        return <Line {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      default:
        return <Bar {...chartProps} />;
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    const IconComponent = isUser ? UserCircleIcon : ComputerDesktopIcon;
    const AgentIconComponent = message.agent_type ? agentIcons[message.agent_type] : SparklesIcon;
    const agentColorClass = message.agent_type ? agentColors[message.agent_type] : 'text-blue-600 bg-blue-50';

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            {isUser ? (
              <IconComponent className="h-8 w-8 text-gray-600" />
            ) : (
              <div className={`p-1.5 rounded-full ${agentColorClass}`}>
                <AgentIconComponent className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <div className={`px-4 py-3 rounded-lg ${isUser 
            ? 'bg-blue-600 text-white' 
            : message.error 
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-gray-100 text-gray-900'
          }`}>
            {!isUser && message.agent_type && (
              <div className="flex items-center mb-2 text-sm opacity-75">
                <AgentIconComponent className="h-4 w-4 mr-1" />
                <span className="capitalize">{message.agent_type} Agent</span>
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {/* Render charts if available */}
            {message.charts && message.charts.length > 0 && (
              <div className="mt-4 space-y-4">
                {message.charts.map((chart, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      {chart.title}
                    </h4>
                    <div className="h-64">
                      {renderChart(chart)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Render insights if available */}
            {message.insights && Object.keys(message.insights).length > 0 && (
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border">
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Key Insights
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {message.insights.key_insights && message.insights.key_insights.map((insight, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                  {message.insights.metrics && Object.entries(message.insights.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">
                        {typeof value === 'number' && key.includes('rate') 
                          ? `${value.toFixed(1)}%`
                          : typeof value === 'number' && (key.includes('amount') || key.includes('balance') || key.includes('total'))
                            ? `$${value.toLocaleString()}`
                            : value
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs opacity-50">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getWelcomeMessage = () => {
    const selectedAgentData = availableAgents.find(agent => agent.id === selectedAgent);
    return `👋 Hi! I'm your ${selectedAgentData?.name || 'AI Assistant'}. I can help you with ${selectedAgentData?.description || 'analyzing your business data'}. What would you like to know about ${companyName}?`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Agent Selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <span className="text-sm text-gray-500">• {companyName}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <label htmlFor="agent-select" className="text-sm font-medium text-gray-700">
              Agent:
            </label>
            <select
              id="agent-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.icon} {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Agent Description */}
        {availableAgents.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {availableAgents.find(agent => agent.id === selectedAgent)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className={`mx-auto p-3 rounded-full w-16 h-16 mb-4 ${agentColors[selectedAgent] || 'text-blue-600 bg-blue-50'}`}>
                {React.createElement(agentIcons[selectedAgent] || SparklesIcon, { className: 'h-8 w-8 mx-auto' })}
              </div>
              <p className="text-gray-600 mb-4">{getWelcomeMessage()}</p>
              
              {/* Suggested Questions */}
              {availableAgents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Try asking:</p>
                  <div className="space-y-1">
                    {availableAgents.find(agent => agent.id === selectedAgent)?.capabilities?.slice(0, 3).map((capability, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(`Tell me about ${capability.toLowerCase()}`)}
                        className="block w-full text-left px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        "Tell me about {capability.toLowerCase()}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex max-w-3xl">
                  <div className="mr-3">
                    <div className={`p-1.5 rounded-full ${agentColors[selectedAgent] || 'text-blue-600 bg-blue-50'}`}>
                      {React.createElement(agentIcons[selectedAgent] || SparklesIcon, { className: 'h-5 w-5' })}
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Analyzing your data...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about your business data..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;