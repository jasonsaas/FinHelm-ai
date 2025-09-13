// Stripe configuration and utilities
export const STRIPE_CONFIG = {
  // Public keys (safe to expose)
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  
  // Trial period settings
  trialDays: 14,
  
  // Pricing tiers
  plans: {
    beta: {
      name: 'Beta Special',
      price: 149,
      interval: 'month',
      features: [
        'Full QuickBooks Integration',
        'AI-Powered CFO Insights',
        'Automated Financial Reports',
        'Cash Flow Predictions',
        'Priority Support'
      ]
    },
    starter: {
      name: 'Starter',
      price: 99,
      interval: 'month',
      features: [
        'QuickBooks Integration',
        'Basic Financial Reports',
        'Email Support'
      ]
    },
    growth: {
      name: 'Growth',
      price: 299,
      interval: 'month',
      features: [
        'Everything in Starter',
        'Advanced AI Analytics',
        'Custom Report Builder',
        'Priority Support'
      ]
    },
    scale: {
      name: 'Scale',
      price: 499,
      interval: 'month',
      features: [
        'Everything in Growth',
        'API Access',
        'Dedicated Account Manager',
        'Phone Support'
      ]
    }
  }
};

// Helper to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};