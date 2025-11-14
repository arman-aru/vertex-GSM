"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    price: "$49",
    period: "per month",
    blurb: "Everything you need to run a growing unlocking business.",
    features: [
      "Unlimited Orders",
      "Supplier Failover Routing",
      "SMS Unlock Notifications",
      "Custom Domain + Branding",
      "Basic Analytics",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    slug: "enterprise",
    price: "$149",
    period: "per month",
    blurb: "Scale operations & automate with premium tooling.",
    features: [
      "Priority Supplier Queue",
      "Advanced Reporting + Export",
      "API Rate Enhancements",
      "Dedicated Support",
      "White-Label CMS Suite",
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const subscribe = async (planSlug: string) => {
    if (!session?.user) {
      toast.info("Please log in as a reseller to subscribe.");
      router.push("/login");
      return;
    }
    if (session.user.role !== "RESELLER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      toast.error("Only reseller admins can subscribe.");
      return;
    }
    setLoadingPlan(planSlug);
    try {
      const res = await fetch("/api/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planSlug }),
      });
      if (!res.ok) throw new Error("Failed to start subscription");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Subscription error");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <section className="w-full py-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Simple, Scalable Pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose a plan that matches your unlocking business growth. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-12 w-full">
        <div className="grid gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.highlighted ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.highlighted && <Badge>Popular</Badge>}
                </div>
                <CardDescription>{plan.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span> <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button disabled={loadingPlan === plan.slug} className="w-full" onClick={() => subscribe(plan.slug)}>
                  {loadingPlan === plan.slug ? "Redirecting..." : `Subscribe to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-12 text-center text-xs text-muted-foreground">
          Stripe secure billing • Cancel anytime • VAT may apply
        </div>
      </main>
    </div>
  );
}
