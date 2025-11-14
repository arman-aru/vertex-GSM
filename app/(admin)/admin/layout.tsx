"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar, MobileSidebar } from "./components/sidebar"
import { Header } from "./components/header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 border-r bg-background">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64">
          {/* Header with mobile menu */}
          <Header
            mobileMenuTrigger={
              <MobileSidebar>
                <Sidebar />
              </MobileSidebar>
            }
          />

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
