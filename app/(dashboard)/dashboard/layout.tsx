"use client";

import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
    </SessionProvider>
  );
}
