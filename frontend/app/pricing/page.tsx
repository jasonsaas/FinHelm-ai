'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
  popular?: boolean;
  badge?: string;
}

const plans: PricingPlan[] = [
  {
    id: 'beta',
    name: 'Beta Special',
    price: 149,
    originalPrice: 299,
    badge: '50% OFF - Limited Time!',
    popular: true,
    features: [
      'Full QuickBooks Integration',
      'AI-Powered CFO Insights',
      'Automated Financial Reports',
      'Cash Flow Predictions',
      'Expense Categorization',
      'Priority Support',
      '14-Day Free Trial'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    features: [
      'QuickBooks Integration',
      'Basic Financial Reports',
      'Expense Tracking',
      'Monthly Insights',
      'Email Support',
      '14-Day Free Trial'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299,
    popular: false,
    features: [
      'Everything in Starter',
      'Advanced AI Analytics',
      'Custom Report Builder',
      'Budget Forecasting',
      'Multi-User Access',
      'Priority Support',
      '14-Day Free Trial'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 499,
    features: [
      'Everything in Growth',
      'White-Label Options',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager',
      'Phone Support',
      '14-Day Free Trial'
    ]
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled');

  const handleCheckout = async (planId: string) => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }
    
    setLoading(planId);
    
    try {
      const res = await fetch('/api/stripe/quick-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: planId,
          email 
        })
      });
      
      const data = await res.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start your 14-day free trial. No credit card required for signup.
          </p>
          
          {/* Beta Offer Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl mb-8 max-w-2xl mx-auto shadow-xl">
            <p className="text-2xl font-bold mb-2">
              🎉 Limited Beta Offer
            </p>
            <p className="text-lg">
              First 20 customers get 50% off forever - Only $149/month!
            </p>
            <p className="text-sm mt-2 opacity-90">
              7 spots remaining • Offer expires in 48 hours
            </p>
          </div>
          
          {cancelled && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-8 max-w-2xl mx-auto">
              No worries! Take your time to explore our pricing options.
            </div>
          )}
          
          {/* Email Input */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="email"
              placeholder="Enter your email to get started"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'border-2 border-blue-600 transform scale-105' : 'border border-gray-200'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              {plan.popular && !plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h2>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                {plan.originalPrice && (
                  <p className="text-sm text-gray-500 line-through mt-1">
                    Originally ${plan.originalPrice}/mo
                  </p>
                )}
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id || !email}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? 'Processing...' : 'Start Free Trial'}
              </button>
            </div>
          ))}
        </div>
        
        {/* Trust Badges */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-8 mb-8">
            <div className="text-gray-600">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">Bank-Level Security</p>
            </div>
            <div className="text-gray-600">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">QuickBooks Certified</p>
            </div>
            <div className="text-gray-600">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">Cancel Anytime</p>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm">
            Questions? Email us at{' '}
            <a href="mailto:support@finhelm.ai" className="text-blue-600 hover:underline">
              support@finhelm.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}