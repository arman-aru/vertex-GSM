import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // Rate limiting
  const identifier = getRateLimitIdentifier(request);
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

  try {
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract metadata
        const userId = session.metadata?.userId;
        const resellerId = session.metadata?.resellerId;
        const amount = parseFloat(session.metadata?.amount || "0");

        if (!userId || !resellerId || !amount) {
          console.error("Missing required metadata in checkout session");
          return NextResponse.json(
            { error: "Missing metadata" },
            { status: 400 }
          );
        }

        // Process the payment - Update user balance and create transaction
        await prisma.$transaction(async (tx: any) => {
          // Update user balance
          await tx.user.update({
            where: { id: userId },
            data: {
              balance: {
                increment: amount,
              },
            },
          });

          // Create a dummy order for the credit purchase (optional)
          const orderNumber = `CREDIT-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)
            .toUpperCase()}`;

          const order = await tx.order.create({
            data: {
              orderNumber,
              status: "COMPLETED",
              totalAmount: amount,
              currency: session.currency || "usd",
              items: {
                type: "credit_purchase",
                amount,
                description: "Account credit purchase",
              },
              userId,
              resellerId,
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              amount,
              currency: session.currency?.toUpperCase() || "USD",
              stripePaymentId: session.payment_intent as string,
              status: "paid",
              paymentMethod: session.payment_method_types?.[0] || "card",
              metadata: {
                checkoutSessionId: session.id,
                customerEmail: session.customer_email,
                customerDetails: session.customer_details,
              },
              orderId: order.id,
              resellerId,
            },
          });
        });

        console.log(
          `✅ Payment successful: $${amount} added to user ${userId}`
        );
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        // Handle async payment success (e.g., SEPA, ACH)
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Async payment succeeded:", session.id);
        // Similar processing as above
        break;
      }

      case "checkout.session.async_payment_failed": {
        // Handle async payment failure
        const session = event.data.object as Stripe.Checkout.Session;
        console.error("Async payment failed:", session.id);
        break;
      }

      case "payment_intent.payment_failed": {
        // Handle payment failure
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("Payment failed:", paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
