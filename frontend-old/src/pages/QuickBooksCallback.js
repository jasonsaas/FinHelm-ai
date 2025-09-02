import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI, setQuickBooksSession } from '../services/api';
import toast from 'react-hot-toast';

const QuickBooksCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    handleQuickBooksCallback();
  }, []);

  const handleQuickBooksCallback = async () => {
    try {
      // Get parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const realmId = searchParams.get('realmId');
      const error = searchParams.get('error');

      // Check for OAuth errors
      if (error) {
        throw new Error(`QuickBooks OAuth error: ${error}`);
      }

      if (!code || !state || !realmId) {
        throw new Error('Missing required OAuth parameters from QuickBooks');
      }

      // Validate state parameter
      const storedState = localStorage.getItem('qb_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state parameter - possible security issue');
      }

      // Clean up stored state
      localStorage.removeItem('qb_oauth_state');

      // Exchange authorization code for access token
      const response = await authAPI.handleQuickBooksCallback({
        code: code,
        state: state,
        realmId: realmId
      });

      const { session_token, company_name, realm_id } = response.data;

      // Store session token and company info
      setQuickBooksSession(session_token);
      localStorage.setItem('qb_company_name', company_name);
      localStorage.setItem('qb_realm_id', realm_id);

      setCompanyName(company_name);
      setStatus('success');
      
      toast.success(`Successfully connected to ${company_name}!`);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);

    } catch (error) {
      console.error('QuickBooks OAuth callback error:', error);
      setStatus('error');
      
      const message = error.response?.data?.detail || error.message || 'QuickBooks connection failed';
      toast.error(message);

      // Redirect to dashboard after delay (user can try again)
      setTimeout(() => {
        navigate('/dashboard');
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100">
                <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Connecting to QuickBooks
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Please wait while we securely connect your QuickBooks account...
              </p>
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Connection Successful! 🎉
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Successfully connected to <span className="font-semibold text-blue-600">{companyName}</span>
              </p>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Your QuickBooks data is now available for AI analysis. Redirecting to your dashboard...
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Connection Failed
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                There was an issue connecting to QuickBooks. Don't worry, you can try again.
              </p>
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  Please try connecting again from your dashboard, or contact support if the issue persists.
                </p>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>

        {/* Progress indicator */}
        {status === 'processing' && (
          <div className="mt-8">
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Establishing secure connection...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickBooksCallback;