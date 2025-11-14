# VertexGSM Production Deployment Guide

## Pre-Deployment Checklist

### 1. Database Setup
- [ ] Create production PostgreSQL database (Neon, Supabase, Railway, or Vercel Postgres)
- [ ] Get connection string with pooling enabled (append `?pgbouncer=true` for pooled connections)
- [ ] Test connection locally: `npx prisma db pull --url="your_production_url"`

### 2. Stripe Setup
- [ ] Create Stripe account (or switch to live mode)
- [ ] Create subscription products:
  - **Pro Plan**: $49/month recurring
  - **Enterprise Plan**: $149/month recurring
- [ ] Copy Price IDs from Stripe Dashboard
- [ ] Create webhook endpoints:
  
**Webhook 1: Standard Payments**
- URL: `https://your-domain.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`
- Copy signing secret

**Webhook 2: Subscriptions**
- URL: `https://your-domain.vercel.app/api/webhooks/stripe-subscription`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy signing secret

### 3. Generate Secrets
Run these commands to generate secure keys:

```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Key
openssl rand -hex 32
```

---

## Vercel Deployment Steps

### Step 1: Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
vercel login
```

### Step 2: Push Code to GitHub
```bash
git add .
git commit -m "Production ready - VertexGSM v1.0"
git push origin main
```

### Step 3: Import Project to Vercel

**Via Vercel Dashboard:**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run vercel-build` (auto from package.json)
   - **Output Directory**: `.next` (auto)

### Step 4: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

#### Core Platform
```
DATABASE_URL=postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1
NEXTAUTH_SECRET=<from openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

#### Stripe (Standard Payments)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from webhook 1)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### Stripe (Subscriptions)
```
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET=whsec_... (from webhook 2)
```

#### Security
```
ENCRYPTION_KEY=<from openssl rand -hex 32>
```

**Important:** Set all variables for **Production**, **Preview**, and **Development** environments as needed.

### Step 5: Deploy
Click **Deploy** button or run:
```bash
vercel --prod
```

### Step 6: Post-Deployment Verification

#### Database Migration Check
```bash
# Check if migrations ran successfully
vercel logs --prod | grep "prisma migrate deploy"
```

If migrations didn't run, manually trigger:
```bash
# Connect to your project
vercel env pull .env.production
# Run migrations
npx prisma migrate deploy
```

#### Health Checks
1. **Homepage**: `https://your-domain.vercel.app/marketing`
2. **Pricing Page**: `https://your-domain.vercel.app/marketing/pricing`
3. **Login**: `https://your-domain.vercel.app/login`
4. **Webhook 1**: `curl https://your-domain.vercel.app/api/webhooks/stripe` (should return 400 - expected)
5. **Webhook 2**: `curl https://your-domain.vercel.app/api/webhooks/stripe-subscription` (should return 200 with `{"ok":true}`)

#### Create Super Admin User
```bash
# Connect to production database via psql or DB GUI
psql $DATABASE_URL

# Create super admin
INSERT INTO users (id, email, name, password, role, "resellerId", "isActive", balance)
VALUES (
  gen_random_uuid()::text,
  'admin@vertexgsm.com',
  'Super Admin',
  '$2a$10$...',  -- Generate with: node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
  'SUPER_ADMIN',
  (SELECT id FROM resellers LIMIT 1),  -- Or create a system reseller first
  true,
  0
);
```

#### Test Full Flow
1. Register as reseller
2. Superadmin approves via `/superadmin/resellers`
3. Generate license key
4. Subscribe to a plan
5. Configure supplier (DHRU credentials)
6. Configure Webex SMS
7. Place test order
8. Verify SMS notification (if enabled)

---

## Custom Domain Setup (Optional)

### Add Custom Domain in Vercel
1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed by Vercel
4. Update environment variables:
   ```
   NEXTAUTH_URL=https://app.yourdomain.com
   NEXT_PUBLIC_BASE_URL=https://app.yourdomain.com
   ```
5. Update Stripe webhook URLs to new domain
6. Redeploy

---

## Monitoring & Maintenance

### Set Up Monitoring (Recommended)
1. **Vercel Analytics**: Enable in Project Settings
2. **Sentry** (optional):
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
   Add `SENTRY_DSN` to env vars

3. **Log Drains**: Configure in Vercel → Integrations

### Database Backups
- **Neon**: Auto-backups enabled by default
- **Supabase**: Configure point-in-time recovery
- **Railway**: Enable daily snapshots

### Security Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Redeploy
git push
```

---

## Troubleshooting

### Build Fails with Prisma Error
**Error**: `Prisma Client could not locate the Query Engine`

**Fix**: Ensure `postinstall` script runs:
```json
"postinstall": "prisma generate"
```

### Database Connection Timeout
**Error**: `Can't reach database server`

**Fix**: Use pooled connection string:
```
postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1
```

### Webhook Signature Verification Failed
**Error**: `Invalid signature`

**Fix**: 
1. Verify webhook secret matches Stripe Dashboard
2. Check webhook endpoint URL is exact (no trailing slash)
3. Ensure raw body parsing (Next.js handles this automatically for API routes)

### Environment Variables Not Loading
**Fix**: 
1. Check variable names match exactly (case-sensitive)
2. Redeploy after adding new variables
3. For local testing, use `vercel env pull`

---

## Rollback Procedure

If deployment fails:
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

---

## Cost Optimization

### Vercel
- **Free Tier**: Sufficient for testing (100GB bandwidth, serverless functions)
- **Pro**: $20/month (unlimited bandwidth, advanced features)

### Database
- **Neon Free**: 0.5GB storage, 3GB data transfer
- **Supabase Free**: 500MB database, 2GB bandwidth
- **Railway**: Pay-as-you-go ($5 base + usage)

### Stripe
- **Standard**: 2.9% + $0.30 per transaction
- **Volume discounts** available for high-volume

---

## Next Steps After Deployment

1. **Documentation**: Update internal wiki/docs with:
   - Admin credentials
   - Webhook endpoints
   - Support contacts

2. **User Onboarding**: Create:
   - Reseller registration guide
   - Admin panel walkthrough
   - API integration docs (for developers)

3. **Marketing**:
   - Announce launch
   - Update social media
   - Send invites to beta users

4. **Support Setup**:
   - Configure support ticket system
   - Set up monitoring alerts
   - Create runbook for common issues

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Stripe Docs**: https://stripe.com/docs

---

**Deployment Completed!** 🚀

Your VertexGSM platform is now live and ready to onboard resellers.
