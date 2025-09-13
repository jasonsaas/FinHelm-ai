import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle successful checkout
        console.log('✅ Payment successful for:', session.customer_email);
        
        // TODO: Update user subscription status in database
        // For now, just log the successful payment
        console.log('Subscription created:', {
          customerId: session.customer,
          subscriptionId: session.subscription,
          plan: session.metadata?.plan,
          email: session.customer_email
        });
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Subscription updated:', {
          id: subscription.id,
          status: subscription.status,
          customerId: subscription.customer
        });
        
        // TODO: Update subscription status in database
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Subscription cancelled:', {
          id: subscription.id,
          customerId: subscription.customer
        });
        
        // TODO: Update user to free tier in database
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        console.log('Payment received:', {
          amount: invoice.amount_paid / 100,
          customerId: invoice.customer
        });
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        console.log('Payment failed:', {
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count
        });
        
        // TODO: Send payment failed email to customer
        break;
      }
      
      default:
        console.log('Unhandled event type:', event.type);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Stripe webhooks require raw body
export const config = {
  api: {
    bodyParser: false,
  },
};