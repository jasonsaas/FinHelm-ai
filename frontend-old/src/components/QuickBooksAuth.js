import React, { useState } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const QuickBooksAuth = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickBooksConnect = async () => {
    setIsLoading(true);

    try {
      // Get OAuth authorization URL from backend
      const response = await authAPI.getQuickBooksOAuthUrl();
      const { authorization_url, state } = response.data;

      // Store state for validation
      localStorage.setItem('qb_oauth_state', state);

      // Redirect to QuickBooks OAuth
      window.location.href = authorization_url;

    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to initiate QuickBooks connection';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="https://plugin.intuitcdn.net/designsystem/assets/2020/12/18/01/03/45/a82f8f18-e74e-43c7-a685-9f8b9b75c0a6/qb-desktop-icon.svg" 
            alt="QuickBooks" 
            className="mx-auto h-20 w-20"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connect to QuickBooks Online
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure OAuth 2.0 connection to unlock AI-powered financial insights
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Benefits Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              🚀 What you'll get with QuickCauz.ai:
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                AI-powered financial analysis and insights
              </li>
              <li className="flex items-start">
                <span className="mr-2">🔮</span>
                Revenue forecasting and trend predictions
              </li>
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                Actionable recommendations for business growth
              </li>
              <li className="flex items-start">
                <span className="mr-2">📈</span>
                Real-time chat with your financial data
              </li>
              <li className="flex items-start">
                <span className="mr-2">🤖</span>
                Powered by xAI's Grok for advanced reasoning
              </li>
            </ul>
          </div>

          {/* Security Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  🔐 Secure & Private
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Industry-standard OAuth 2.0 authentication</li>
                    <li>Your credentials never shared with QuickCauz.ai</li>
                    <li>Read-only access to your financial data</li>
                    <li>Revoke access anytime from QuickBooks settings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <div className="space-y-4">
            <button
              onClick={handleQuickBooksConnect}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                <svg className="h-6 w-6 text-blue-300 group-hover:text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Connecting to QuickBooks...
                </div>
              ) : (
                'Connect with QuickBooks Online'
              )}
            </button>
          </div>

          {onCancel && (
            <div className="flex justify-center">
              <button
                onClick={onCancel}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Connection Process</span>
            </div>
          </div>
          <div className="mt-6">
            <ol className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</span>
                <div>
                  <p className="font-medium">Secure Redirect</p>
                  <p className="text-gray-500">You'll be redirected to QuickBooks' secure login page</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</span>
                <div>
                  <p className="font-medium">Authorize Access</p>
                  <p className="text-gray-500">Grant QuickCauz.ai read-only access to your financial data</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</span>
                <div>
                  <p className="font-medium">Start Analyzing</p>
                  <p className="text-gray-500">Return to QuickCauz.ai and start getting AI insights</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickBooksAuth;