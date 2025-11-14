import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/rate-limit";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET || "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  // Rate limiting
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": RATE_LIMITS.WEBHOOK.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(rateLimitResult.resetAt).toISOString(),
        }
      }
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription && session.metadata?.resellerId) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = subscription.current_period_end * 1000; // to ms
          const resellerId = session.metadata.resellerId;
          const plan = session.metadata.plan || "pro";

          // Upsert a license for the reseller (simple single active license logic)
          const existing = await prisma.license.findFirst({ where: { resellerId } });
          if (existing) {
            await prisma.license.update({
              where: { id: existing.id },
              data: { status: "ACTIVE", expiresAt: new Date(periodEnd) },
            });
          } else {
            const key = "LIC-" + crypto.randomBytes(12).toString("hex").toUpperCase();
            await prisma.license.create({
              data: {
                key,
                status: "ACTIVE",
                resellerId,
                expiresAt: new Date(periodEnd),
              },
            });
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const periodEnd = subscription.current_period_end * 1000;
        const metadata = subscription.metadata;
        const resellerId = metadata?.resellerId;
        if (resellerId) {
          const existing = await prisma.license.findFirst({ where: { resellerId } });
          if (subscription.status === "active") {
            if (existing) {
              await prisma.license.update({
                where: { id: existing.id },
                data: { status: "ACTIVE", expiresAt: new Date(periodEnd) },
              });
            }
          } else if (subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "past_due") {
            if (existing) {
              await prisma.license.update({
                where: { id: existing.id },
                data: { status: "INACTIVE" },
              });
            }
          }
        }
        break;
      }
      default:
        // Ignore other events
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook processing error", e);
    return NextResponse.json({ error: e.message || "Webhook error" }, { status: 500 });
  }
}

export async function GET() { // simple health check
  return NextResponse.json({ ok: true });
}
