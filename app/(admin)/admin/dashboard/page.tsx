"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  DollarSign,
  FileText,
  UserPlus,
  TrendingUp,
} from "lucide-react"
import { RevenueChart, CustomerChart } from "../components/charts"
import { toast } from "sonner"

interface DashboardStats {
  orderStats: {
    waiting: number
    inProcess: number
    success: number
    rejected: number
  }
  monthlyStats: {
    totalProfit: number
    invoicePaid: number
    newCustomers: number
  }
  revenueData: Array<{
    month: string
    revenue: number
    profit: number
  }>
  customerData: Array<{
    month: string
    customers: number
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard-stats")
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats")
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Failed to load dashboard statistics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your business performance
        </p>
      </div>

      {/* Order Status KPI Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Order Status</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderStats.waiting}</div>
              <p className="text-xs text-muted-foreground">
                Orders pending processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Process</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderStats.inProcess}</div>
              <p className="text-xs text-muted-foreground">
                Orders being processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderStats.success}</div>
              <p className="text-xs text-muted-foreground">
                Completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderStats.rejected}</div>
              <p className="text-xs text-muted-foreground">
                Cancelled orders
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* This Month Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4">This Month</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.monthlyStats.totalProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue from completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoice Paid</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyStats.invoicePaid}</div>
              <p className="text-xs text-muted-foreground">
                Paid transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Customer</CardTitle>
              <UserPlus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyStats.newCustomers}</div>
              <p className="text-xs text-muted-foreground">
                New registrations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Attract - Charts Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">User Attract</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <RevenueChart data={stats.revenueData} />
          <CustomerChart data={stats.customerData} />
        </div>
      </div>
    </div>
  )
}
