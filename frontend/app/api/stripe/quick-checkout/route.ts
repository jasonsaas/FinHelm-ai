import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Quick price setup (create in Stripe Dashboard)
const PRICES = {
  beta: process.env.STRIPE_PRICE_BETA || 'price_beta_149', // $149/mo (50% off for beta)
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_99',
  growth: process.env.STRIPE_PRICE_GROWTH || 'price_growth_299',
  scale: process.env.STRIPE_PRICE_SCALE || 'price_scale_499'
};

export async function POST(req: NextRequest) {
  try {
    const { plan = 'beta', email } = await req.json();
    
    // Validate plan
    if (!PRICES[plan as keyof typeof PRICES]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: PRICES[plan as keyof typeof PRICES],
        quantity: 1
      }],
      mode: 'subscription',
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?cancelled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan,
          source: 'finhelm_beta'
        }
      },
      metadata: {
        plan,
        email
      }
    });
    
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}