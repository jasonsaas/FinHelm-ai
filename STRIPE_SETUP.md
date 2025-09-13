# Stripe Payment Setup Guide

## Quick Start (5 minutes)

### 1. Create Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete business verification (can operate in test mode immediately)

### 2. Get Your API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Test Secret Key** (starts with `sk_test_`)
3. Copy your **Test Publishable Key** (starts with `pk_test_`)

### 3. Create Products & Prices in Stripe
1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click "Add Product" and create 4 products:

#### Beta Special ($149/month)
- Name: "FinHelm Beta Special"
- Price: $149.00
- Billing: Monthly
- Save the Price ID (starts with `price_`)

#### Starter ($99/month)
- Name: "FinHelm Starter"
- Price: $99.00
- Billing: Monthly
- Save the Price ID

#### Growth ($299/month)
- Name: "FinHelm Growth"
- Price: $299.00
- Billing: Monthly
- Save the Price ID

#### Scale ($499/month)
- Name: "FinHelm Scale"
- Price: $499.00
- Billing: Monthly
- Save the Price ID

### 4. Set Up Webhook
1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add Endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook Secret** (starts with `whsec_`)

### 5. Configure Environment Variables
Create a `.env.local` file in the `frontend` directory:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_BETA=price_YOUR_BETA_PRICE_ID
STRIPE_PRICE_STARTER=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_GROWTH=price_YOUR_GROWTH_PRICE_ID
STRIPE_PRICE_SCALE=price_YOUR_SCALE_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
NEXT_PUBLIC_URL=http://localhost:3000
```

### 6. Test the Integration
1. Start your development server
2. Navigate to `/pricing`
3. Enter a test email
4. Click "Start Free Trial" on any plan
5. Use test card: `4242 4242 4242 4242`
6. Any future date for expiry
7. Any 3 digits for CVC
8. Any ZIP code

## Production Deployment

### Switch to Live Mode
1. Get your Live API keys from Stripe Dashboard
2. Create products in Live mode
3. Update environment variables with live keys
4. Update webhook endpoint URL to production domain

### Testing Webhook Locally
Use Stripe CLI for local testing:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
```

## Revenue Tracking

### View Payments
- Test Mode: [https://dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments)
- Live Mode: [https://dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)

### View Customers
- Test Mode: [https://dashboard.stripe.com/test/customers](https://dashboard.stripe.com/test/customers)
- Live Mode: [https://dashboard.stripe.com/customers](https://dashboard.stripe.com/customers)

## Support
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)
- API Documentation: [https://stripe.com/docs/api](https://stripe.com/docs/api)
- Testing Guide: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)