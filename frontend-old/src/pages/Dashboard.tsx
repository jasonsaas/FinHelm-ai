import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import classNames from 'classnames';

import {
  getStoredUser,
  setAuthToken,
  setStoredUser,
  isQuickBooksConnected,
  chatAPI,
  agentsAPI,
  quickbooksAPI,
} from '../services/api';

import ChatInterface from '../components/ChatInterface';
import QuickBooksAuth from '../components/QuickBooksAuth';
import Sidebar from '../components/Sidebar';

import {
  ChatBubbleLeftRightIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ChatSession {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  messages: any[];
}

interface User {
  id: number;
  username: string;
  email: string;
  qbo_company_name?: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showQuickBooksAuth, setShowQuickBooksAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Fetch chat sessions
  const { data: chatSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: chatAPI.getSessions,
    enabled: !!user,
  });

  // Fetch agent recommendations
  const { data: agentRecommendations } = useQuery({
    queryKey: ['agent-recommendations'],
    queryFn: agentsAPI.getRecommendations,
    enabled: !!user,
  });

  // Check QuickBooks connection status
  const { data: qbStatus, isLoading: qbLoading } = useQuery({
    queryKey: ['quickbooks-status'],
    queryFn: quickbooksAPI.getReconciliationStatus,
    enabled: !!user && isQuickBooksConnected(),
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Create new chat session mutation
  const createSessionMutation = useMutation({
    mutationFn: () => chatAPI.createSession({ title: 'New Chat' }),
    onSuccess: (newSession) => {
      setCurrentSessionId(newSession.session_id);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      toast.success('New chat session created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create chat session');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      setAuthToken(null);
      setStoredUser(null);
      localStorage.clear();
    },
    onSuccess: () => {
      navigate('/login');
      toast.success('Logged out successfully');
    },
  });

  const handleNewChat = () => {
    createSessionMutation.mutate();
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSessionChange = (session: ChatSession) => {
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
  };

  const isQuickBooksConnected = () => {
    return qbStatus && !qbStatus.error;
  };

  const getQuickBooksStatusColor = () => {
    if (qbLoading) return 'text-gray-500';
    if (isQuickBooksConnected()) return 'text-green-600';
    return 'text-red-500';
  };

  const getQuickBooksStatusText = () => {
    if (qbLoading) return 'Checking connection...';
    if (isQuickBooksConnected()) return `Connected to ${qbStatus.company_name}`;
    return 'Not connected';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chatSessions={chatSessions || []}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        loading={sessionsLoading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>

              {/* Logo and title */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ERPInsight.ai</h1>
                  <p className="text-sm text-gray-600">AI-powered business insights</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* QuickBooks Status */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"
              >
                <BuildingOfficeIcon className={classNames('w-4 h-4', getQuickBooksStatusColor())} />
                <span className={classNames('text-sm font-medium', getQuickBooksStatusColor())}>
                  {getQuickBooksStatusText()}
                </span>
                {isQuickBooksConnected() && (
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                )}
              </motion.div>

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
                  </div>
                </div>

                {/* Settings and logout */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowQuickBooksAuth(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Settings"
                  >
                    <CogIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isLoading}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex">
          {!isQuickBooksConnected() ? (
            // QuickBooks Connection Required
            <div className="flex-1 flex items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Connect QuickBooks Online
                </h2>
                <p className="text-gray-600 mb-6">
                  To get AI-powered insights about your business, please connect your QuickBooks Online account first.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowQuickBooksAuth(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Connect QuickBooks Online
                </motion.button>

                {/* Features Preview */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  {[
                    {
                      icon: <CurrencyDollarIcon className="w-6 h-6 text-green-600" />,
                      title: 'Financial Analysis',
                      description: 'Get insights on cash flow, profitability, and financial trends'
                    },
                    {
                      icon: <ChartBarIcon className="w-6 h-6 text-blue-600" />,
                      title: 'Sales Intelligence',
                      description: 'Analyze customer behavior and sales performance'
                    },
                    {
                      icon: <CogIcon className="w-6 h-6 text-purple-600" />,
                      title: 'Operations Optimization',
                      description: 'Optimize expenses, inventory, and vendor relationships'
                    }
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="p-4 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="mb-2">{feature.icon}</div>
                      <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            // Main Chat Interface
            <div className="flex-1 flex">
              <ChatInterface
                sessionId={currentSessionId || undefined}
                onSessionChange={handleSessionChange}
                className="flex-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* QuickBooks Auth Modal */}
      <AnimatePresence>
        {showQuickBooksAuth && (
          <QuickBooksAuth
            isOpen={showQuickBooksAuth}
            onClose={() => setShowQuickBooksAuth(false)}
            onSuccess={() => {
              setShowQuickBooksAuth(false);
              queryClient.invalidateQueries({ queryKey: ['quickbooks-status'] });
              toast.success('QuickBooks connected successfully!');
            }}
          />
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;