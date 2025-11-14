"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Wallet,
  LifeBuoy,
  UserCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface BrandingData {
  companyName: string;
  customLogoUrl: string | null;
  customDomain: string | null;
}

interface SidebarProps {
  onClose?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Place Order", href: "/dashboard/place-order", icon: ShoppingCart },
  { name: "My Orders", href: "/dashboard/orders", icon: Receipt },
  { name: "Add Funds", href: "/dashboard/add-funds", icon: Wallet },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Account", href: "/dashboard/account", icon: UserCircle },
  { name: "Documentation", href: "/dashboard/docs", icon: FileText },
];

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch("/api/branding");
        if (res.ok) {
          const data = await res.json();
          setBranding(data);
        }
      } catch (error) {
        console.error("Failed to fetch branding:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBranding();
  }, []);

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        {loading ? (
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
        ) : (
          <>
            {branding?.customLogoUrl ? (
              <img
                src={branding.customLogoUrl}
                alt={branding.companyName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {branding?.companyName?.charAt(0) || "V"}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {branding?.companyName || "Vertex GSM"}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 text-center">
          {loading ? (
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mx-auto" />
          ) : (
            <span>&copy; 2024 {branding?.companyName || "Vertex GSM"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
