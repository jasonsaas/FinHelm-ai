import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  authAPI, 
  chatAPI, 
  getStoredUser, 
  setAuthToken, 
  setStoredUser, 
  isQuickBooksConnected,
  getQuickBooksSession,
  setQuickBooksSession 
} from '../services/api';
import ChatInterface from '../components/ChatInterface';
import QuickBooksAuth from '../components/QuickBooksAuth';
import toast from 'react-hot-toast';
import { 
  ChatBubbleLeftRightIcon, 
  CogIcon, 
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [user, setUser] = useState(getStoredUser());
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isQuickBooksAuthenticated, setIsQuickBooksAuthenticated] = useState(false);
  const [showQuickBooksAuth, setShowQuickBooksAuth] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadChatSessions();
    checkQuickBooksConnection();
  }, [user, navigate]);

  const checkQuickBooksConnection = () => {
    const isConnected = isQuickBooksConnected();
    setIsQuickBooksAuthenticated(isConnected);
    
    if (isConnected) {
      const storedCompanyName = localStorage.getItem('qb_company_name');
      setCompanyName(storedCompanyName || 'QuickBooks Company');
    } else {
      setShowQuickBooksAuth(true);
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await chatAPI.getSessions();
      setChatSessions(response.data);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthToken(null);
      setStoredUser(null);
      setQuickBooksSession(null);
      localStorage.removeItem('qb_company_name');
      localStorage.removeItem('qb_realm_id');
      navigate('/login');
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await chatAPI.createSession({ title: 'New Financial Analysis' });
      const newSession = response.data;
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.session_id);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleSessionSelect = (sessionId) => {
    setCurrentSessionId(sessionId);
  };

  const handleSessionChange = (sessionId) => {
    setCurrentSessionId(sessionId);
    loadChatSessions(); // Refresh sessions list
  };

  const handleQuickBooksAuthSuccess = () => {
    setIsQuickBooksAuthenticated(true);
    setShowQuickBooksAuth(false);
    checkQuickBooksConnection();
    toast.success('QuickBooks connected successfully!');
  };

  const handleDisconnectQuickBooks = () => {
    setQuickBooksSession(null);
    localStorage.removeItem('qb_company_name');
    localStorage.removeItem('qb_realm_id');
    setIsQuickBooksAuthenticated(false);
    setCompanyName('');
    toast.success('Disconnected from QuickBooks');
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (showQuickBooksAuth && !isQuickBooksAuthenticated) {
    return (
      <QuickBooksAuth 
        onSuccess={handleQuickBooksAuthSuccess}
        onCancel={() => setShowQuickBooksAuth(false)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">QuickCauz.ai</h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            Welcome back, <span className="font-medium">{user?.username}</span>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Financial Analysis
          </button>
        </div>

        {/* QuickBooks Connection Status */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">QuickBooks Online</span>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isQuickBooksAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${isQuickBooksAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {isQuickBooksAuthenticated ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {isQuickBooksAuthenticated ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">{companyName}</p>
                  <p className="text-xs text-green-600">Ready for AI analysis</p>
                </div>
                <button
                  onClick={handleDisconnectQuickBooks}
                  className="text-xs text-green-700 hover:text-green-900 underline"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-xs text-red-800 mb-2">Connect QuickBooks to enable AI insights</p>
              <button
                onClick={() => setShowQuickBooksAuth(true)}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Connect Now
              </button>
            </div>
          )}
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              Recent Analyses
            </h3>
            {chatSessions.length === 0 ? (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-2">No analyses yet</p>
                <p className="text-xs text-gray-400">Start by asking about your financial data!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session.session_id)}
                    className={`w-full text-left p-3 rounded-md border transition-all duration-200 ${
                      currentSessionId === session.session_id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.updated_at || session.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <CogIcon className="h-4 w-4 mr-2" />
            Settings & Preferences
          </button>
          <div className="mt-2 text-xs text-gray-500">
            Powered by xAI Grok • v2.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isQuickBooksAuthenticated ? (
          <ChatInterface 
            sessionId={currentSessionId}
            onSessionChange={handleSessionChange}
            companyName={companyName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto">
              <CurrencyDollarIcon className="h-20 w-20 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Connect QuickBooks Online
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your QuickBooks Online account to unlock powerful AI-driven financial insights, 
                forecasting, and personalized recommendations powered by Grok.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setShowQuickBooksAuth(true)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
                >
                  Connect QuickBooks Online
                </button>
                <div className="text-sm text-gray-500">
                  ✓ Secure OAuth 2.0 authentication<br/>
                  ✓ Read-only access to your data<br/>
                  ✓ Revoke access anytime
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;