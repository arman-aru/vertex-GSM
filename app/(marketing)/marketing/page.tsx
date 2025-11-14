import React from "react";
import Image from "next/image";
import Link from "next/link";

async function getFeaturedResellers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/marketing/featured-resellers`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getFooterPages() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/marketing/footer-pages`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function MarketingPage() {
  const [featured, pages] = await Promise.all([getFeaturedResellers(), getFooterPages()]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Hero Section */}
      <section className="w-full py-20 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">GSM Theme makes your business easier</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Launch a fully white-labeled unlocking & services portal with automated supplier routing, real-time balance management, and SMS unlock-code notifications.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition">Get Started</Link>
            <Link href="/login" className="px-6 py-3 rounded-md border border-input hover:bg-accent transition">Log In</Link>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="w-full py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold mb-8">Advanced Platform Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 shadow-sm hover:shadow transition">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Resellers */}
      <section className="w-full py-16 bg-muted/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Featured Distributors</h2>
            <Link href="/register" className="text-sm text-primary hover:underline">Become a Reseller</Link>
          </div>
          {featured.length === 0 && (
            <p className="text-sm text-muted-foreground">No featured resellers yet. Check back soon.</p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((r: any) => (
              <div key={r.id} className="rounded-lg border bg-card p-4 flex flex-col items-center gap-3 shadow-sm">
                {r.customLogoUrl ? (
                  <Image src={r.customLogoUrl} alt={r.companyName} width={120} height={60} className="object-contain" />
                ) : (
                  <div className="w-[120px] h-[60px] flex items-center justify-center text-xs text-muted-foreground border rounded">
                    {r.companyName}
                  </div>
                )}
                <div className="text-center">
                  <p className="font-medium text-sm">{r.companyName}</p>
                  {r.customDomain && (
                    <Link href={`https://${r.customDomain}`} target="_blank" className="text-xs text-primary hover:underline">
                      {r.customDomain}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full py-10 border-t bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="font-semibold">GSM Theme</p>
              <p className="text-xs text-muted-foreground">Empowering unlocking & repair businesses globally.</p>
            </div>
            <nav className="flex flex-wrap gap-4 text-sm">
              {pages.map((p: any) => (
                <Link key={p.id} href={`/marketing/${p.slug}`} className="text-muted-foreground hover:text-primary transition">
                  {p.title}
                </Link>
              ))}
            </nav>
          </div>
          <p className="text-xs text-muted-foreground mt-8">© {new Date().getFullYear()} GSM Theme. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Fully White-Label Portal",
    description: "Customize logos, colors, and domain for a seamless brand experience across user dashboards and notifications.",
  },
  {
    title: "Automated SMS Alerts",
    description: "Send unlock codes instantly with intelligent encoding detection and segment-based cost tracking.",
  },
  {
    title: "Multi-API Price Routing",
    description: "Integrate multiple suppliers and route orders based on real-time priority & availability.",
  },
  {
    title: "Supplier Priority Failover",
    description: "Automatically retry with fallback suppliers to reduce failures and maximize successful deliveries.",
  },
  {
    title: "Stripe Balance Management",
    description: "Secure wallet top-ups, transaction history, and automated balance adjustments from service outcomes.",
  },
  {
    title: "DHRU API Integration",
    description: "Native support for placing and tracking unlocking orders via DHRU with normalized responses.",
  },
];
