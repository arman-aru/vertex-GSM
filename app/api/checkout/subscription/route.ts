import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RESELLER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { plan } = await req.json();
    if (!plan || !PLAN_PRICE_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: "Price ID not configured" }, { status: 500 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/marketing/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/marketing/pricing?canceled=true`,
      metadata: {
        resellerId: session.user.resellerId || "",
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e: any) {
    console.error("Subscription checkout error", e);
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
