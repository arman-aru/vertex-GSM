"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, FileText, Shield, CreditCard, MessageSquare } from "lucide-react"

const settingsNav = [
  {
    title: "Branding",
    href: "/admin/settings/branding",
    icon: Building2,
    description: "Company name and logo",
  },
    {
      title: "SMS Notifications",
      href: "/admin/settings/webex",
      icon: MessageSquare,
      description: "Webex Connect API",
    },
  {
    title: "CMS Content",
    href: "/admin/settings/cms",
    icon: FileText,
    description: "Manage your pages",
  },
  {
    title: "Security",
    href: "/admin/settings/security",
    icon: Shield,
    description: "Password and 2FA",
  },
  {
    title: "Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    description: "Plans and invoices",
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and application settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Settings Navigation */}
        <aside className="space-y-2">
          {settingsNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link key={item.href} href={item.href}>
                <Card
                  className={cn(
                    "transition-colors hover:bg-accent cursor-pointer",
                    isActive && "bg-accent border-primary"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-sm font-medium leading-none",
                          isActive && "text-primary"
                        )}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </aside>

        {/* Settings Content */}
        <div>{children}</div>
      </div>
    </div>
  )
}
