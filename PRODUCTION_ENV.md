# Production Environment Variables Reference

Copy these to Vercel Project Settings → Environment Variables

## Required Variables

### Database
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true&connection_limit=1"
# Get from: Neon, Supabase, Railway, or Vercel Postgres
# Use pooled connection for serverless compatibility

### NextAuth (Authentication)
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
# Example: "8X3k9mP2qR7tY5nL6jH4gF1sA0dW9zC8="

NEXTAUTH_URL="https://your-domain.vercel.app"
# Update after custom domain setup

NEXT_PUBLIC_BASE_URL="https://your-domain.vercel.app"
# Used for Stripe redirects and internal API calls

### Stripe - Standard Payments (Balance Top-Ups)
STRIPE_SECRET_KEY="sk_live_..."
# From: Stripe Dashboard → Developers → API Keys

STRIPE_WEBHOOK_SECRET="whsec_..."
# From: Stripe Dashboard → Developers → Webhooks
# Endpoint: https://your-domain.vercel.app/api/webhooks/stripe
# Events: checkout.session.completed

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
# Safe to expose client-side

### Stripe - Subscriptions (SaaS Revenue)
STRIPE_PRO_PRICE_ID="price_..."
# From: Stripe Dashboard → Products → Pro Plan → Pricing
# Create monthly recurring price

STRIPE_ENTERPRISE_PRICE_ID="price_..."
# From: Stripe Dashboard → Products → Enterprise Plan → Pricing

STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET="whsec_..."
# From: Stripe Dashboard → Developers → Webhooks
# Endpoint: https://your-domain.vercel.app/api/webhooks/stripe-subscription
# Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

### Security - Encryption
ENCRYPTION_KEY="generate-with: openssl rand -hex 32"
# Example: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
# CRITICAL: Keep this consistent across all deployments
# Used to encrypt Webex API keys and other sensitive reseller data

---

## Optional Variables (Future Use)

### Email (SMTP)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="SG.xxx"
# For transactional emails (password reset, notifications)

### Monitoring
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
# Error tracking and performance monitoring

POSTHOG_KEY="phc_xxx"
# Product analytics

### Feature Flags
ENABLE_SUBSCRIPTIONS="true"
# Toggle features without redeploying

---

## Environment-Specific Settings

### Production
- Use live Stripe keys (sk_live_, pk_live_)
- Enable monitoring (Sentry, PostHog)
- Set secure encryption key
- Use production database with backups

### Preview (Staging)
- Can use test Stripe keys (sk_test_, pk_test_)
- Use separate database
- Same encryption key as production (if testing migrations)

### Development (Local)
- Use .env.local file
- Test Stripe keys
- Local database (Docker Postgres)
- Warning: encryption key for local testing only

---

## Security Best Practices

1. **Never commit .env files** to Git
   - .env.local ✓ (gitignored)
   - .env.example ✓ (safe, no real values)
   - .env ✗ (danger!)

2. **Rotate secrets regularly**
   - Every 90 days: NEXTAUTH_SECRET, ENCRYPTION_KEY
   - After team changes: All API keys
   - After breach: Immediately

3. **Use environment-specific keys**
   - Production: Live Stripe, production DB
   - Staging: Test Stripe, staging DB
   - Never mix!

4. **Limit access**
   - Only admins can view Vercel env vars
   - Use Vercel Teams for access control
   - Audit logs regularly

5. **Backup encryption key securely**
   - Store in password manager (1Password, LastPass)
   - Keep offline backup
   - Document recovery procedure

---

## Verification Commands

### Test Database Connection
```bash
# Local test
npx prisma db pull --url="$DATABASE_URL"

# Generate client
npx prisma generate
```

### Generate Secure Keys
```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Key
openssl rand -hex 32

# Test encryption (Node.js)
node -e "const crypto=require('crypto');const key='your-key-here';console.log('Key length:',Buffer.from(key,'hex').length,'bytes')"
```

### Verify Stripe Setup
```bash
# Test API key
curl https://api.stripe.com/v1/customers \
  -u sk_test_xxx:

# List products
curl https://api.stripe.com/v1/products \
  -u sk_test_xxx:
```

### Test Webhooks Locally (Stripe CLI)
```bash
# Install
brew install stripe/stripe-cli/stripe
# or
scoop install stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe-subscription
```

---

## Quick Copy Template (Update Values)

```bash
# Core
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-app.vercel.app"
NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"

# Stripe Standard
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Stripe Subscriptions
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."
STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET="whsec_..."

# Security
ENCRYPTION_KEY="..."
```

---

## Troubleshooting

### "Invalid environment variable" error
- Check for typos in variable names
- Ensure no extra spaces or quotes
- Redeploy after adding variables

### Database connection fails
- Verify connection string format
- Check IP whitelist (if applicable)
- Test with pgbouncer=true parameter

### Stripe webhook signature mismatch
- Copy exact secret from Stripe Dashboard
- No spaces or extra characters
- Redeploy to refresh environment

### Encryption fails in production
- ENCRYPTION_KEY must be set
- Key must be 32 bytes (64 hex chars)
- Never change key after encrypting data (existing data becomes unreadable)

---

**Ready to Deploy?** Follow steps in DEPLOYMENT.md
