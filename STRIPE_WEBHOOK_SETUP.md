# Stripe Webhook Setup Guide

This guide will help you set up Stripe webhooks for processing payments in the Vertex GSM platform.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Stripe CLI installed (for local testing)
- Application running locally or deployed

## Setup Steps

### 1. Get Your Stripe Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** > **API Keys**
3. Copy your **Publishable key** and **Secret key**
4. Add them to your `.env` file:

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 2. Set Up Webhook (Local Development)

For local testing, use the Stripe CLI:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. The CLI will display a webhook signing secret like `whsec_...`
5. Add it to your `.env` file:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### 3. Set Up Webhook (Production)

For production deployment:

1. Go to **Developers** > **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your production environment variables

## Webhook Endpoint Details

**Endpoint:** `/api/webhooks/stripe`

**Events Handled:**
- `checkout.session.completed` - Main event for successful payments
- `checkout.session.async_payment_succeeded` - For delayed payment methods
- `checkout.session.async_payment_failed` - Payment failure handling
- `payment_intent.payment_failed` - Payment intent failures

**What It Does:**
1. Verifies webhook signature for security
2. Updates user's account balance
3. Creates order record
4. Creates transaction record
5. Links payment to Stripe payment intent

## Testing

### Test the Webhook Locally

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Trigger a test webhook:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Test the Full Payment Flow

1. Navigate to `/dashboard/add-funds`
2. Select an amount (e.g., $50)
3. Click "Add Funds with Stripe"
4. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. Complete the payment
6. You should be redirected back with success message
7. Check your balance - it should be updated

## Troubleshooting

### Webhook Not Receiving Events

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check that Stripe CLI is running (local) or endpoint is correct (production)
- Review webhook logs in Stripe Dashboard

### Signature Verification Failed

- Ensure you're using the correct webhook secret for your environment
- Make sure you're not modifying the raw request body before verification

### Balance Not Updating

- Check server logs for errors
- Verify database connection
- Ensure user ID and reseller ID are in session metadata

## Security Notes

- **Never expose** your `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`
- Always verify webhook signatures before processing
- Use HTTPS in production
- Implement idempotency to handle duplicate webhooks

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
